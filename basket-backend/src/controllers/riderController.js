const Order = require('../models/Order');
const Rider = require('../models/Rider');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { getRedisClient, REDIS_KEYS, REDIS_TTL } = require('../config/redis');
const { notifyOrderStatus } = require('../services/notificationService');
const {
  emitOrderStatusUpdate,
  emitOrderUpdateToAdmin,
  emitRiderStatusToAdmin,
  emitRiderLocation,
} = require('../socket/emitters');
const { cancelAutoAssignment } = require('../services/assignmentService');
const { paginatedResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

// ── Internal: Get rider doc from currently logged-in user ─────────────
const getRiderByUser = async (userId) => {
  return Rider.findOne({ user: userId, isActive: true })
    .populate('user', 'name phone')
    .populate('darkStore', 'name address');
};

// ────────────────────────────────────────────────────────────────────
// @desc   Get rider profile + current stats
// @route  GET /api/rider/profile
// @access Private/Rider
// ────────────────────────────────────────────────────────────────────
exports.getRiderProfile = asyncHandler(async (req, res) => {
  const rider = await getRiderByUser(req.user._id);

  if (!rider) {
    return res.status(404).json({ success: false, error: 'Rider profile not found' });
  }

  res.status(200).json({ success: true, data: rider });
});

// ────────────────────────────────────────────────────────────────────
// @desc   Toggle rider status online / offline
// @route  PUT /api/rider/status
// @access Private/Rider
// ────────────────────────────────────────────────────────────────────
exports.toggleStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!['available', 'offline'].includes(status)) {
    return res.status(400).json({
      success: false,
      error: "Status must be 'available' (online) or 'offline'",
    });
  }

  const rider = await Rider.findOne({ user: req.user._id });
  if (!rider) {
    return res.status(404).json({ success: false, error: 'Rider profile not found' });
  }

  // Can't go offline while handling an active order
  if (status === 'offline' && rider.currentOrder) {
    return res.status(400).json({
      success: false,
      error: 'Complete your current delivery before going offline',
    });
  }

  rider.status = status;
  await rider.save();

  // ── Socket: Notify admin of rider status change ────────────────────
  emitRiderStatusToAdmin(rider._id.toString(), status, req.user.name);

  logger.info(`Rider ${req.user.phone} is now ${status}`);

  res.status(200).json({
    success: true,
    message: `You are now ${status === 'available' ? '🟢 Online' : '🔴 Offline'}`,
    data: { status: rider.status },
  });
});

// ────────────────────────────────────────────────────────────────────
// @desc   Get orders assigned to this rider
// @route  GET /api/rider/orders
// @access Private/Rider
// ────────────────────────────────────────────────────────────────────
exports.getAssignedOrders = asyncHandler(async (req, res) => {
  const rider = await Rider.findOne({ user: req.user._id });
  if (!rider) {
    return res.status(404).json({ success: false, error: 'Rider profile not found' });
  }

  const { status, page = 1, limit = 10 } = req.query;

  const query = { rider: rider._id };
  if (status) query.status = status;
  else query.status = { $in: ['packing', 'out_for_delivery'] };

  const skip = (Number(page) - 1) * Number(limit);

  const [orders, totalItems] = await Promise.all([
    Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('user', 'name phone')
      .populate('darkStore', 'name address location')
      .select('-deliveryOTP -__v -razorpaySignature')
      .lean(),
    Order.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    ...paginatedResponse(orders, page, limit, totalItems),
  });
});

// ────────────────────────────────────────────────────────────────────
// @desc   Accept assigned order (within 30 seconds)
// @route  PUT /api/rider/orders/:id/accept
// @access Private/Rider
// ────────────────────────────────────────────────────────────────────
exports.acceptOrder = asyncHandler(async (req, res) => {
  const rider = await Rider.findOne({ user: req.user._id });
  if (!rider) {
    return res.status(404).json({ success: false, error: 'Rider profile not found' });
  }

  if (rider.status === 'busy') {
    return res.status(400).json({
      success: false,
      error: 'You already have an active delivery. Complete it first.',
    });
  }

  // Atomic update — only succeeds if order is still 'placed' and unassigned
  const order = await Order.findOneAndUpdate(
    { _id: req.params.id, status: 'placed', rider: null },
    { rider: rider._id, status: 'packing' },
    { new: true }
  ).populate('user', 'name phone fcmToken');

  if (!order) {
    return res.status(404).json({
      success: false,
      error: 'Order not found or already taken by another rider',
    });
  }

  // Cancel auto-assignment timer — rider accepted manually
  cancelAutoAssignment(order._id.toString());

  // Update rider
  rider.status = 'busy';
  rider.currentOrder = order._id;
  await rider.save();

  // ── Notify customer via FCM ────────────────────────────────────────
  await notifyOrderStatus(order.user, order.orderId, 'packing');

  // ── Socket emissions ───────────────────────────────────────────────
  emitOrderStatusUpdate(order._id.toString(), {
    status: 'packing',
    message: '📦 Rider accepted your order and is packing it',
    rider: { name: req.user.name, phone: req.user.phone },
  });

  emitOrderUpdateToAdmin({
    orderId: order.orderId,
    status: 'packing',
    riderId: rider._id.toString(),
    riderName: req.user.name,
  });

  logger.info(`Rider ${req.user.phone} accepted order ${order.orderId}`);

  res.status(200).json({
    success: true,
    message: 'Order accepted! Head to the dark store.',
    data: {
      orderId: order.orderId,
      status: order.status,
      customer: { name: order.user.name, phone: order.user.phone },
      items: order.items,
      deliveryAddress: order.deliveryAddress,
      grandTotal: order.grandTotal,
      paymentMethod: order.paymentMethod,
    },
  });
});

// ────────────────────────────────────────────────────────────────────
// @desc   Update order delivery status
// @route  PUT /api/rider/orders/:id/status
// @access Private/Rider
// @body   { status: 'out_for_delivery' | 'delivered', deliveryOTP?: '1234' }
// ────────────────────────────────────────────────────────────────────
exports.updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, deliveryOTP } = req.body;

  const validTransitions = ['out_for_delivery', 'delivered'];
  if (!validTransitions.includes(status)) {
    return res.status(400).json({
      success: false,
      error: "Status must be 'out_for_delivery' or 'delivered'",
    });
  }

  const rider = await Rider.findOne({ user: req.user._id });
  if (!rider) {
    return res.status(404).json({ success: false, error: 'Rider profile not found' });
  }

  const order = await Order.findOne({
    _id: req.params.id,
    rider: rider._id,
  }).populate('user', 'name phone fcmToken');

  if (!order) {
    return res.status(404).json({ success: false, error: 'Order not found' });
  }

  // Enforce valid status transition
  const allowedFrom = {
    out_for_delivery: 'packing',
    delivered: 'out_for_delivery',
  };

  if (order.status !== allowedFrom[status]) {
    return res.status(400).json({
      success: false,
      error: `Cannot set '${status}' from current status '${order.status}'`,
    });
  }

  // Verify delivery OTP when marking as delivered
  if (status === 'delivered') {
    if (!deliveryOTP) {
      return res.status(400).json({
        success: false,
        error: 'Delivery OTP from customer is required to confirm delivery',
      });
    }
    if (order.deliveryOTP !== deliveryOTP.toString().trim()) {
      return res.status(400).json({
        success: false,
        error: 'Incorrect delivery OTP. Please ask the customer for the correct OTP.',
      });
    }
  }

  // Update order
  order.status = status;
  if (status === 'delivered') {
    order.deliveredAt = new Date();
    order.paymentStatus =
      order.paymentMethod === 'cod' ? 'paid' : order.paymentStatus;
  }
  await order.save();

  // If delivered — update rider stats & free rider
  if (status === 'delivered') {
    const deliveryEarning = 30; // ₹30 per delivery (configurable)

    rider.status = 'available';
    rider.currentOrder = null;
    rider.totalDeliveries += 1;
    rider.earnings.today = parseFloat((rider.earnings.today + deliveryEarning).toFixed(2));
    rider.earnings.thisWeek = parseFloat((rider.earnings.thisWeek + deliveryEarning).toFixed(2));
    rider.earnings.thisMonth = parseFloat((rider.earnings.thisMonth + deliveryEarning).toFixed(2));
    rider.earnings.total = parseFloat((rider.earnings.total + deliveryEarning).toFixed(2));
    await rider.save();

    // Rider is free — notify admin
    emitRiderStatusToAdmin(rider._id.toString(), 'available', req.user.name);
  }

  // ── Notify customer via FCM ────────────────────────────────────────
  await notifyOrderStatus(order.user, order.orderId, status);

  // ── Socket emissions ───────────────────────────────────────────────
  const statusMessages = {
    out_for_delivery: '🏍️ Rider is on the way to your location!',
    delivered: '✅ Order delivered successfully!',
  };

  emitOrderStatusUpdate(order._id.toString(), {
    status,
    message: statusMessages[status],
    ...(status === 'out_for_delivery' && {
      rider: { name: req.user.name, phone: req.user.phone },
    }),
    ...(status === 'delivered' && {
      deliveredAt: order.deliveredAt,
    }),
  });

  emitOrderUpdateToAdmin({
    orderId: order.orderId,
    status,
    riderId: rider._id.toString(),
    riderName: req.user.name,
    ...(status === 'delivered' && { deliveredAt: order.deliveredAt }),
  });

  // Clear cached order status from Redis
  try {
    const redis = getRedisClient();
    await redis.del(REDIS_KEYS.orderStatus(order._id.toString()));
  } catch (_) {}

  res.status(200).json({
    success: true,
    message:
      status === 'delivered'
        ? '🎉 Delivery confirmed! Great job.'
        : '🏍️ Status updated. Navigate to customer.',
    data: { orderId: order.orderId, status },
  });
});

// ────────────────────────────────────────────────────────────────────
// @desc   Update rider GPS location (REST fallback — socket is primary)
// @route  POST /api/rider/location
// @access Private/Rider
// ────────────────────────────────────────────────────────────────────
exports.updateLocation = asyncHandler(async (req, res) => {
  const { latitude, longitude } = req.body;

  if (!latitude || !longitude) {
    return res.status(400).json({ success: false, error: 'latitude and longitude are required' });
  }

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ success: false, error: 'Invalid coordinates' });
  }

  const rider = await Rider.findOneAndUpdate(
    { user: req.user._id },
    { 'currentLocation.coordinates': [lng, lat] },
    { new: true }
  ).select('_id currentOrder darkStore');

  if (!rider) {
    return res.status(404).json({ success: false, error: 'Rider not found' });
  }

  // Store in Redis (30s TTL for live tracking)
  try {
    const redis = getRedisClient();
    await redis.setEx(
      REDIS_KEYS.riderLocation(rider._id.toString()),
      REDIS_TTL.RIDER_LOCATION,
      JSON.stringify({ lat, lng, updatedAt: new Date().toISOString() })
    );
  } catch (_) {}

  // ── Socket: Broadcast rider location to customer if on delivery ────
  if (rider.currentOrder) {
    emitRiderLocation(
      rider.currentOrder.toString(),
      rider._id.toString(),
      { lat, lng }
    );
  }

  res.status(200).json({ success: true });
});

// ────────────────────────────────────────────────────────────────────
// @desc   Get rider earnings dashboard
// @route  GET /api/rider/earnings
// @access Private/Rider
// ────────────────────────────────────────────────────────────────────
exports.getEarnings = asyncHandler(async (req, res) => {
  const rider = await Rider.findOne({ user: req.user._id }).select(
    'earnings totalDeliveries rating onTimeDeliveries'
  );

  if (!rider) {
    return res.status(404).json({ success: false, error: 'Rider not found' });
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const todayDeliveries = await Order.countDocuments({
    rider: rider._id,
    status: 'delivered',
    deliveredAt: { $gte: startOfDay },
  });

  res.status(200).json({
    success: true,
    data: {
      earnings: rider.earnings,
      todayDeliveries,
      totalDeliveries: rider.totalDeliveries,
      rating: rider.rating,
      onTimePercentage: rider.onTimePercentage,
    },
  });
});

// ────────────────────────────────────────────────────────────────────
// @desc   Get rider's delivery history
// @route  GET /api/rider/history
// @access Private/Rider
// ────────────────────────────────────────────────────────────────────
exports.getDeliveryHistory = asyncHandler(async (req, res) => {
  const rider = await Rider.findOne({ user: req.user._id });
  if (!rider) {
    return res.status(404).json({ success: false, error: 'Rider not found' });
  }

  const { page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const [orders, totalItems] = await Promise.all([
    Order.find({ rider: rider._id, status: 'delivered' })
      .sort({ deliveredAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .select('orderId grandTotal paymentMethod deliveredAt rating createdAt')
      .lean(),
    Order.countDocuments({ rider: rider._id, status: 'delivered' }),
  ]);

  res.status(200).json({
    success: true,
    ...paginatedResponse(orders, page, limit, totalItems),
  });
});
