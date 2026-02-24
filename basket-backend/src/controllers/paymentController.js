const Order = require('../models/Order');
const asyncHandler = require('../utils/asyncHandler');
const { verifyPaymentSignature, initiateRefund } = require('../services/paymentService');
const logger = require('../utils/logger');

// ────────────────────────────────────────────────────────────────────
// @desc   Verify Razorpay payment and confirm order
// @route  POST /api/payments/verify
// @access Private
// ────────────────────────────────────────────────────────────────────
exports.verifyPayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId } = req.body;

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !orderId) {
    return res.status(400).json({ success: false, error: 'All payment fields are required' });
  }

  const isValid = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);

  if (!isValid) {
    logger.warn(`Payment signature mismatch — orderId: ${orderId}, user: ${req.user._id}`);
    await Order.findByIdAndUpdate(orderId, { paymentStatus: 'failed' });

    return res.status(400).json({
      success: false,
      error: 'Payment verification failed. Please contact support if money was deducted.',
    });
  }

  const order = await Order.findByIdAndUpdate(
    orderId,
    {
      paymentStatus: 'paid',
      razorpayPaymentId,
      razorpaySignature,
    },
    { new: true }
  ).select('orderId status grandTotal estimatedDeliveryTime');

  if (!order) {
    return res.status(404).json({ success: false, error: 'Order not found' });
  }

  logger.info(`Payment verified: ${razorpayPaymentId} for order ${order.orderId}`);

  res.status(200).json({
    success: true,
    message: 'Payment confirmed! Your order is being prepared. 🛒',
    data: {
      orderId: order.orderId,
      status: order.status,
      grandTotal: order.grandTotal,
      estimatedDeliveryTime: order.estimatedDeliveryTime,
    },
  });
});

// ────────────────────────────────────────────────────────────────────
// @desc   Initiate refund for cancelled order
// @route  POST /api/payments/refund
// @access Private/Admin
// ────────────────────────────────────────────────────────────────────
exports.processRefund = asyncHandler(async (req, res) => {
  const { orderId } = req.body;

  const order = await Order.findById(orderId);

  if (!order) {
    return res.status(404).json({ success: false, error: 'Order not found' });
  }
  if (order.paymentStatus !== 'paid') {
    return res.status(400).json({ success: false, error: 'Order was not paid online. No refund needed.' });
  }
  if (order.paymentStatus === 'refunded') {
    return res.status(400).json({ success: false, error: 'Order has already been refunded' });
  }
  if (!order.razorpayPaymentId) {
    return res.status(400).json({ success: false, error: 'No payment ID found for this order' });
  }

  await initiateRefund(order.razorpayPaymentId, order.grandTotal);

  await Order.findByIdAndUpdate(orderId, { paymentStatus: 'refunded' });

  res.status(200).json({
    success: true,
    message: `Refund of ₹${order.grandTotal} initiated. Will be credited in 5-7 business days.`,
    data: { orderId: order.orderId, refundAmount: order.grandTotal },
  });
});

// ────────────────────────────────────────────────────────────────────
// @desc   Validate coupon code (pre-checkout check)
// @route  POST /api/payments/validate-coupon
// @access Private
// ────────────────────────────────────────────────────────────────────
exports.validateCoupon = asyncHandler(async (req, res) => {
  const { code, orderAmount } = req.body;

  if (!code || !orderAmount) {
    return res.status(400).json({ success: false, error: 'Coupon code and orderAmount are required' });
  }

  const Coupon = require('../models/Coupon');
  const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });

  if (!coupon) {
    return res.status(404).json({ success: false, error: 'Coupon not found or expired' });
  }

  const validation = coupon.isValid(orderAmount, req.user._id);
  if (!validation.valid) {
    return res.status(400).json({ success: false, error: validation.message });
  }

  const discountAmount = coupon.calculateDiscount(orderAmount);

  res.status(200).json({
    success: true,
    message: `Coupon applied! You save ₹${discountAmount.toFixed(2)}`,
    data: {
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount: parseFloat(discountAmount.toFixed(2)),
      finalAmount: parseFloat((orderAmount - discountAmount).toFixed(2)),
    },
  });
});
