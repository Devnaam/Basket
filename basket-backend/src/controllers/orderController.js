const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const DarkStore = require('../models/DarkStore');
const Coupon = require('../models/Coupon');
const asyncHandler = require('../utils/asyncHandler');
const { getRedisClient, REDIS_KEYS } = require('../config/redis');
const { calculateDeliveryFee, calculateGST, paginatedResponse, generateOTP } = require('../utils/helpers');
const { createRazorpayOrder } = require('../services/paymentService');
const {
  emitNewOrderToAdmin,
  emitOrderStatusUpdate,
  emitOrderUpdateToAdmin,
} = require('../socket/emitters');
const { scheduleAutoAssignment, cancelAutoAssignment } = require('../services/assignmentService');
const logger = require('../utils/logger');

// ────────────────────────────────────────────────────────────────────
// @desc   Create new order from cart
// @route  POST /api/orders
// @access Private/Customer
// ────────────────────────────────────────────────────────────────────
exports.createOrder = asyncHandler(async (req, res) => {
  const { deliveryAddress, paymentMethod, couponCode, savedAddressId } = req.body;
  const userId = req.user._id.toString();

  // ── 1. Get cart from Redis ─────────────────────────────────────────
  const redis = getRedisClient();
  const rawCart = await redis.get(REDIS_KEYS.cart(userId));
  const cartItems = rawCart ? JSON.parse(rawCart) : [];

  if (cartItems.length === 0) {
    return res.status(400).json({ success: false, error: 'Your cart is empty' });
  }

  // ── 2. Resolve delivery address ────────────────────────────────────
  let finalAddress = deliveryAddress;

  if (savedAddressId) {
    const user = await User.findById(userId);
    const saved = user.addresses.find((a) => a._id.toString() === savedAddressId);
    if (!saved) {
      return res.status(400).json({ success: false, error: 'Saved address not found' });
    }
    finalAddress = saved;
  }

  if (!finalAddress?.location?.coordinates?.length) {
    return res.status(400).json({
      success: false,
      error: 'Valid delivery address with coordinates required',
    });
  }

  const [longitude, latitude] = finalAddress.location.coordinates;

  // ── 3. Find nearest dark store ─────────────────────────────────────
  const darkStore = await DarkStore.findNearest(longitude, latitude);

  if (!darkStore) {
    return res.status(400).json({
      success: false,
      error: 'Sorry, we do not deliver to your location yet. We are expanding soon!',
    });
  }

  // ── 4. Validate cart items & fetch live product data ───────────────
  const productIds = cartItems.map((i) => i.productId);
  const products = await Product.find({
    _id: { $in: productIds },
    darkStore: darkStore._id,
    isActive: true,
  });

  const productMap = products.reduce((map, p) => {
    map[p._id.toString()] = p;
    return map;
  }, {});

  const orderItems = [];
  const stockErrors = [];

  for (const cartItem of cartItems) {
    const product = productMap[cartItem.productId];

    if (!product) {
      stockErrors.push(`"${cartItem.productId}" is unavailable from nearest store`);
      continue;
    }
    if (product.stock < cartItem.quantity) {
      stockErrors.push(`Only ${product.stock} unit(s) of "${product.name}" available`);
      continue;
    }

    orderItems.push({
      product: product._id,
      name: product.name,
      price: product.price,
      mrp: product.mrp,
      quantity: cartItem.quantity,
      unit: product.unit,
      image: product.images[0] || null,
    });
  }

  if (stockErrors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Some items are unavailable or out of stock',
      details: stockErrors,
    });
  }

  // ── 5. Calculate totals ────────────────────────────────────────────
  const totalAmount = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const isSubscriber = req.user.isBasketPlusActive();
  let deliveryFee = calculateDeliveryFee(totalAmount, isSubscriber);
  let discount = 0;
  let appliedCoupon = null;

  // ── 6. Validate & apply coupon ─────────────────────────────────────
  if (couponCode) {
    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });

    if (!coupon) {
      return res.status(400).json({ success: false, error: 'Invalid or expired coupon code' });
    }

    const validation = coupon.isValid(totalAmount, userId);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.message });
    }

    discount = coupon.calculateDiscount(totalAmount);
    appliedCoupon = coupon;
  }

  const gst = calculateGST(totalAmount - discount);
  const grandTotal = parseFloat(
    (totalAmount - discount + deliveryFee + gst.total).toFixed(2)
  );

  // ── 7. Generate delivery OTP (for rider delivery confirmation) ─────
  const deliveryOTP = generateOTP().slice(0, 4); // 4-digit OTP

  // ── 8. Estimated delivery time (20 minutes from now) ──────────────
  const estimatedDeliveryTime = new Date(Date.now() + 20 * 60 * 1000);

  // ── 9. Create order in DB ──────────────────────────────────────────
  const order = await Order.create({
    user: userId,
    items: orderItems,
    totalAmount: parseFloat(totalAmount.toFixed(2)),
    deliveryFee,
    discount: parseFloat(discount.toFixed(2)),
    gst,
    grandTotal,
    deliveryAddress: finalAddress,
    status: 'placed',
    darkStore: darkStore._id,
    paymentMethod,
    paymentStatus: 'pending',
    couponCode: couponCode || null,
    estimatedDeliveryTime,
    deliveryOTP,
  });

  // ── 10. Decrement stock for all items ──────────────────────────────
  const stockUpdatePromises = orderItems.map((item) =>
    Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } })
  );
  await Promise.all(stockUpdatePromises);

  // ── 11. Mark coupon as used ────────────────────────────────────────
  if (appliedCoupon) {
    appliedCoupon.usedCount += 1;
    appliedCoupon.usedBy.push({ user: userId, orderId: order.orderId });
    await appliedCoupon.save();
  }

  // ── 12. Clear cart ─────────────────────────────────────────────────
  await redis.del(REDIS_KEYS.cart(userId));

  logger.info(`Order created: ${order.orderId} | ₹${grandTotal} | ${paymentMethod}`);

  // ── 13. Emit to admin live feed ────────────────────────────────────
  emitNewOrderToAdmin({
    _id: order._id,
    orderId: order.orderId,
    grandTotal,
    paymentMethod,
    status: 'placed',
    itemCount: orderItems.length,
    darkStore: darkStore.name,
  });

  // ── 14. Schedule auto rider assignment (30s window for riders) ─────
  // Only schedule after payment is confirmed for UPI — for COD schedule immediately
  if (paymentMethod === 'cod') {
    scheduleAutoAssignment(order._id, darkStore._id, {
      orderId: order.orderId,
      grandTotal,
      itemCount: orderItems.length,
      paymentMethod,
      estimatedDeliveryTime,
    });
  }

  // ── 15. Handle UPI — create Razorpay order ─────────────────────────
  if (paymentMethod === 'upi') {
    try {
      const razorpayOrder = await createRazorpayOrder(grandTotal, order.orderId);

      await Order.findByIdAndUpdate(order._id, {
        razorpayOrderId: razorpayOrder.id,
      });

      return res.status(201).json({
        success: true,
        message: 'Order created. Complete payment to confirm.',
        data: {
          order: {
            _id: order._id,
            orderId: order.orderId,
            grandTotal,
            estimatedDeliveryTime,
            status: order.status,
          },
          payment: {
            razorpayOrderId: razorpayOrder.id,
            amount: razorpayOrder.amount, // In paise
            currency: 'INR',
            razorpayKeyId: process.env.RAZORPAY_KEY_ID,
          },
        },
      });
    } catch (paymentError) {
      // Razorpay failed — cancel order, restore stock, notify admin
      await Order.findByIdAndUpdate(order._id, {
        status: 'cancelled',
        cancellationReason: 'Payment gateway error',
        cancelledBy: 'system',
      });

      await Promise.all(
        orderItems.map((item) =>
          Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } })
        )
      );

      emitOrderUpdateToAdmin({
        orderId: order.orderId,
        status: 'cancelled',
        reason: 'Payment gateway error',
      });

      return res.status(500).json({
        success: false,
        error: 'Payment gateway error. Please try again.',
      });
    }
  }

  // ── COD — Order confirmed immediately ─────────────────────────────
  res.status(201).json({
    success: true,
    message: 'Order placed successfully! 🛒',
    data: {
      order: {
        _id: order._id,
        orderId: order.orderId,
        grandTotal,
        estimatedDeliveryTime,
        status: order.status,
        paymentMethod: 'cod',
        deliveryOTP, // Show OTP to customer immediately for COD
      },
    },
  });
});

// ────────────────────────────────────────────────────────────────────
// @desc   Get user's order history
// @route  GET /api/orders
// @access Private
// ────────────────────────────────────────────────────────────────────
exports.getOrderHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  const query = { user: req.user._id };
  if (status) query.status = status;

  const skip = (Number(page) - 1) * Number(limit);

  const [orders, totalItems] = await Promise.all([
    Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .select(
        'orderId status grandTotal paymentMethod paymentStatus createdAt estimatedDeliveryTime items'
      )
      .lean(),
    Order.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    ...paginatedResponse(orders, page, limit, totalItems),
  });
});

// ────────────────────────────────────────────────────────────────────
// @desc   Track order by BSK... orderId
// @route  GET /api/orders/track/:orderId
// @access Private
// ────────────────────────────────────────────────────────────────────
exports.trackOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ orderId: req.params.orderId })
    .select(
      'orderId status statusHistory estimatedDeliveryTime deliveredAt rider items grandTotal deliveryAddress'
    )
    .populate('rider', 'user vehicleType currentLocation')
    .populate({ path: 'rider', populate: { path: 'user', select: 'name phone' } })
    .lean();

  if (!order) {
    return res.status(404).json({ success: false, error: 'Order not found' });
  }

  // Security: ensure user can only track their own orders
  const fullOrder = await Order.findOne({ orderId: req.params.orderId }).select('user');
  if (
    fullOrder.user.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  res.status(200).json({ success: true, data: order });
});

// ────────────────────────────────────────────────────────────────────
// @desc   Get single order details by MongoDB ID
// @route  GET /api/orders/:id
// @access Private
// ────────────────────────────────────────────────────────────────────
exports.getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({
    _id: req.params.id,
    user: req.user._id,
  })
    .populate('darkStore', 'name address')
    .populate({ path: 'rider', populate: { path: 'user', select: 'name phone' } })
    .select('-deliveryOTP -__v')
    .lean();

  if (!order) {
    return res.status(404).json({ success: false, error: 'Order not found' });
  }

  res.status(200).json({ success: true, data: order });
});

// ────────────────────────────────────────────────────────────────────
// @desc   Cancel order
// @route  PUT /api/orders/:id/cancel
// @access Private
// ────────────────────────────────────────────────────────────────────
exports.cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });

  if (!order) {
    return res.status(404).json({ success: false, error: 'Order not found' });
  }

  const nonCancellableStatuses = ['out_for_delivery', 'delivered', 'cancelled'];
  if (nonCancellableStatuses.includes(order.status)) {
    return res.status(400).json({
      success: false,
      error: `Cannot cancel an order that is "${order.status}"`,
    });
  }

  const { reason = 'Cancelled by customer' } = req.body;

  // Cancel any pending auto-assignment timer
  cancelAutoAssignment(order._id.toString());

  order.status = 'cancelled';
  order.cancellationReason = reason;
  order.cancelledBy = 'customer';
  await order.save();

  // Restore stock
  await Promise.all(
    order.items.map((item) =>
      Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } })
    )
  );

  // Free assigned rider if any
  if (order.rider) {
    const Rider = require('../models/Rider');
    await Rider.findByIdAndUpdate(order.rider, {
      status: 'available',
      currentOrder: null,
    });
  }

  // ── Socket emissions ───────────────────────────────────────────────
  emitOrderStatusUpdate(order._id.toString(), {
    status: 'cancelled',
    message: 'Your order has been cancelled',
    cancellationReason: reason,
  });

  emitOrderUpdateToAdmin({
    orderId: order.orderId,
    status: 'cancelled',
    reason,
    cancelledBy: 'customer',
  });

  res.status(200).json({
    success: true,
    message: 'Order cancelled successfully',
    data: {
      orderId: order.orderId,
      status: 'cancelled',
      refundNote:
        order.paymentMethod === 'upi' && order.paymentStatus === 'paid'
          ? 'Refund will be processed within 5-7 business days'
          : null,
    },
  });
});

// ────────────────────────────────────────────────────────────────────
// @desc   Rate an order (after delivery)
// @route  POST /api/orders/:id/rate
// @access Private
// ────────────────────────────────────────────────────────────────────
exports.rateOrder = asyncHandler(async (req, res) => {
  const { rating, review } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ success: false, error: 'Rating must be between 1 and 5' });
  }

  const order = await Order.findOne({
    _id: req.params.id,
    user: req.user._id,
    status: 'delivered',
  });

  if (!order) {
    return res.status(404).json({
      success: false,
      error: 'Order not found or not yet delivered',
    });
  }

  if (order.rating) {
    return res.status(400).json({
      success: false,
      error: 'You have already rated this order',
    });
  }

  order.rating = rating;
  if (review) order.review = review.trim().slice(0, 500);
  await order.save();

  // Update rider rating if assigned
  if (order.rider) {
    const Rider = require('../models/Rider');
    const rider = await Rider.findById(order.rider);
    if (rider) await rider.updateRating(rating);
  }

  res.status(200).json({ success: true, message: 'Thank you for your feedback! ⭐' });
});
