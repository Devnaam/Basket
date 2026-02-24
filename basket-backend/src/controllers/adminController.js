const User = require('../models/User');
const Order = require('../models/Order');
const Rider = require('../models/Rider');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const DarkStore = require('../models/DarkStore');
const asyncHandler = require('../utils/asyncHandler');
const { paginatedResponse } = require('../utils/helpers');
const { notifyRiderNewOrder, notifyOrderStatus } = require('../services/notificationService');
const logger = require('../utils/logger');

// ════════════════════════════════════════════════════════════════════
//  DASHBOARD
// ════════════════════════════════════════════════════════════════════

// ────────────────────────────────────────────────────────────────────
// @desc   Live dashboard metrics
// @route  GET /api/admin/dashboard
// @access Private/Admin
// ────────────────────────────────────────────────────────────────────
exports.getDashboardMetrics = asyncHandler(async (_req, res) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [
    todayOrdersResult,
    activeOrdersCount,
    activeRidersCount,
    totalRidersCount,
    totalCustomersCount,
    lowStockCount,
    recentOrders,
    revenueResult,
  ] = await Promise.all([
    // Today's orders + revenue
    Order.aggregate([
      { $match: { createdAt: { $gte: startOfDay }, status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          revenue: { $sum: '$grandTotal' },
          avgOrderValue: { $avg: '$grandTotal' },
        },
      },
    ]),
    // Active orders (in-progress)
    Order.countDocuments({ status: { $in: ['placed', 'packing', 'out_for_delivery'] } }),
    // Online riders
    Rider.countDocuments({ status: { $in: ['available', 'busy'] } }),
    // Total riders
    Rider.countDocuments({ isActive: true }),
    // Total customers
    User.countDocuments({ role: 'customer', isActive: true }),
    // Low stock products
    Product.countDocuments({ isActive: true, $expr: { $lte: ['$stock', '$lowStockThreshold'] } }),
    // Recent 10 orders (live feed)
    Order.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('user', 'name phone')
      .populate('rider', 'user')
      .populate({ path: 'rider', populate: { path: 'user', select: 'name' } })
      .select('orderId status grandTotal paymentMethod paymentStatus createdAt user rider')
      .lean(),
    // Weekly revenue trend (last 7 days)
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          status: { $ne: 'cancelled' },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$grandTotal' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const todayStats = todayOrdersResult[0] || { count: 0, revenue: 0, avgOrderValue: 0 };

  res.status(200).json({
    success: true,
    data: {
      today: {
        orders: todayStats.count,
        revenue: parseFloat(todayStats.revenue.toFixed(2)),
        avgOrderValue: parseFloat(todayStats.avgOrderValue.toFixed(2)),
      },
      live: {
        activeOrders: activeOrdersCount,
        onlineRiders: activeRidersCount,
      },
      totals: {
        riders: totalRidersCount,
        customers: totalCustomersCount,
        lowStockAlerts: lowStockCount,
      },
      recentOrders,
      weeklyRevenue: revenueResult,
    },
  });
});

// ════════════════════════════════════════════════════════════════════
//  ORDER MANAGEMENT
// ════════════════════════════════════════════════════════════════════

// ────────────────────────────────────────────────────────────────────
// @desc   Get all orders with filters
// @route  GET /api/admin/orders
// @access Private/Admin
// ────────────────────────────────────────────────────────────────────
exports.getAllOrders = asyncHandler(async (req, res) => {
  const {
    status, paymentMethod, paymentStatus,
    darkStore, startDate, endDate,
    page = 1, limit = 20, search,
  } = req.query;

  const query = {};
  if (status) query.status = status;
  if (paymentMethod) query.paymentMethod = paymentMethod;
  if (paymentStatus) query.paymentStatus = paymentStatus;
  if (darkStore) query.darkStore = darkStore;
  if (search) query.orderId = { $regex: search, $options: 'i' };

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [orders, totalItems] = await Promise.all([
    Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('user', 'name phone')
      .populate('darkStore', 'name')
      .populate({ path: 'rider', populate: { path: 'user', select: 'name phone' } })
      .select('-__v -razorpaySignature')
      .lean(),
    Order.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    ...paginatedResponse(orders, page, limit, totalItems),
  });
});

// ────────────────────────────────────────────────────────────────────
// @desc   Get full order details (admin view — includes deliveryOTP)
// @route  GET /api/admin/orders/:id
// @access Private/Admin
// ────────────────────────────────────────────────────────────────────
exports.getOrderDetails = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'name phone email')
    .populate('darkStore', 'name address')
    .populate({ path: 'rider', populate: { path: 'user', select: 'name phone' } })
    .lean();

  if (!order) {
    return res.status(404).json({ success: false, error: 'Order not found' });
  }

  res.status(200).json({ success: true, data: order });
});

// ────────────────────────────────────────────────────────────────────
// @desc   Manually assign rider to order
// @route  PUT /api/admin/orders/:id/assign-rider
// @access Private/Admin
// ────────────────────────────────────────────────────────────────────
exports.assignRider = asyncHandler(async (req, res) => {
  const { riderId } = req.body;

  if (!riderId) {
    return res.status(400).json({ success: false, error: 'riderId is required' });
  }

  const [order, rider] = await Promise.all([
    Order.findById(req.params.id),
    Rider.findById(riderId).populate('user', 'name phone fcmToken'),
  ]);

  if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
  if (!rider) return res.status(404).json({ success: false, error: 'Rider not found' });

  if (!rider.isActive) {
    return res.status(400).json({ success: false, error: 'Rider is blocked or inactive' });
  }

  if (['delivered', 'cancelled'].includes(order.status)) {
    return res.status(400).json({ success: false, error: `Cannot assign rider to a ${order.status} order` });
  }

  // Unassign previous rider if any
  if (order.rider && order.rider.toString() !== riderId) {
    await Rider.findByIdAndUpdate(order.rider, { status: 'available', currentOrder: null });
  }

  // Assign new rider
  order.rider = rider._id;
  if (order.status === 'placed') order.status = 'packing';
  await order.save();

  rider.status = 'busy';
  rider.currentOrder = order._id;
  await rider.save();

  // Notify rider
  await notifyRiderNewOrder(rider, order);

  logger.info(`Admin assigned rider ${rider.user.phone} to order ${order.orderId}`);

  res.status(200).json({
    success: true,
    message: `Rider ${rider.user.name} assigned to order ${order.orderId}`,
    data: { orderId: order.orderId, status: order.status, rider: { name: rider.user.name, phone: rider.user.phone } },
  });
});

// ────────────────────────────────────────────────────────────────────
// @desc   Cancel order (admin)
// @route  PUT /api/admin/orders/:id/cancel
// @access Private/Admin
// ────────────────────────────────────────────────────────────────────
exports.cancelOrderAdmin = asyncHandler(async (req, res) => {
  const { reason = 'Cancelled by admin' } = req.body;

  const order = await Order.findById(req.params.id).populate('user', 'fcmToken');
  if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

  if (['delivered', 'cancelled'].includes(order.status)) {
    return res.status(400).json({ success: false, error: `Order is already ${order.status}` });
  }

  // Free up rider
  if (order.rider) {
    await Rider.findByIdAndUpdate(order.rider, { status: 'available', currentOrder: null });
  }

  // Restore stock
  await Promise.all(
    order.items.map((item) =>
      Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } })
    )
  );

  order.status = 'cancelled';
  order.cancellationReason = reason;
  order.cancelledBy = 'admin';
  await order.save();

  await notifyOrderStatus(order.user, order.orderId, 'cancelled');

  res.status(200).json({
    success: true,
    message: 'Order cancelled and stock restored',
    data: { orderId: order.orderId, refundNote: order.paymentStatus === 'paid' ? 'Initiate refund from /api/payments/refund' : null },
  });
});

// ════════════════════════════════════════════════════════════════════
//  RIDER MANAGEMENT
// ════════════════════════════════════════════════════════════════════

// ────────────────────────────────────────────────────────────────────
// @desc   Get all riders with status + performance
// @route  GET /api/admin/riders
// @access Private/Admin
// ────────────────────────────────────────────────────────────────────
exports.getAllRiders = asyncHandler(async (req, res) => {
  const { status, darkStore, page = 1, limit = 20 } = req.query;

  const query = {};
  if (status) query.status = status;
  if (darkStore) query.darkStore = darkStore;

  const skip = (Number(page) - 1) * Number(limit);

  const [riders, totalItems] = await Promise.all([
    Rider.find(query)
      .skip(skip)
      .limit(Number(limit))
      .populate('user', 'name phone isActive')
      .populate('darkStore', 'name')
      .populate('currentOrder', 'orderId status')
      .select('-__v -idProof')
      .lean({ virtuals: true }),
    Rider.countDocuments(query),
  ]);

  res.status(200).json({ success: true, ...paginatedResponse(riders, page, limit, totalItems) });
});

// ────────────────────────────────────────────────────────────────────
// @desc   Onboard new rider (admin creates user + rider profile)
// @route  POST /api/admin/riders
// @access Private/Admin
// ────────────────────────────────────────────────────────────────────
exports.onboardRider = asyncHandler(async (req, res) => {
  const {
    name, phone, vehicleNumber, vehicleType,
    darkStoreId, idProof, photo,
  } = req.body;

  if (!name || !phone || !vehicleNumber || !vehicleType || !darkStoreId) {
    return res.status(400).json({
      success: false,
      error: 'name, phone, vehicleNumber, vehicleType, darkStoreId are required',
    });
  }

  // Check for duplicate phone
  const existingUser = await User.findOne({ phone });
  if (existingUser && existingUser.role === 'rider') {
    return res.status(400).json({ success: false, error: 'A rider with this phone already exists' });
  }

  const darkStore = await DarkStore.findById(darkStoreId);
  if (!darkStore) {
    return res.status(404).json({ success: false, error: 'Dark store not found' });
  }

  // Create user with rider role
  const user = await User.create({ name, phone, role: 'rider' });

  // Create rider profile
  const rider = await Rider.create({
    user: user._id,
    vehicleNumber: vehicleNumber.toUpperCase(),
    vehicleType,
    darkStore: darkStoreId,
    idProof: idProof || 'pending',
    photo: photo || 'pending',
  });

  logger.info(`New rider onboarded: ${name} (${phone}) → ${darkStore.name}`);

  res.status(201).json({
    success: true,
    message: `Rider ${name} onboarded successfully`,
    data: {
      userId: user._id,
      riderId: rider._id,
      name, phone,
      darkStore: darkStore.name,
      loginInstructions: `Rider can log in via OTP at POST /api/auth/send-otp with phone: ${phone}`,
    },
  });
});

// ────────────────────────────────────────────────────────────────────
// @desc   Block / Unblock rider
// @route  PATCH /api/admin/riders/:id/toggle
// @access Private/Admin
// ────────────────────────────────────────────────────────────────────
exports.toggleRiderStatus = asyncHandler(async (req, res) => {
  const rider = await Rider.findById(req.params.id).populate('user', 'name phone');
  if (!rider) return res.status(404).json({ success: false, error: 'Rider not found' });

  rider.isActive = !rider.isActive;
  if (!rider.isActive) rider.status = 'offline';
  await rider.save();

  // Also update user isActive
  await User.findByIdAndUpdate(rider.user._id, { isActive: rider.isActive });

  res.status(200).json({
    success: true,
    message: `Rider ${rider.user.name} has been ${rider.isActive ? 'unblocked ✅' : 'blocked 🚫'}`,
    data: { riderId: rider._id, isActive: rider.isActive },
  });
});

// ────────────────────────────────────────────────────────────────────
// @desc   Get detailed rider performance
// @route  GET /api/admin/riders/:id/performance
// @access Private/Admin
// ────────────────────────────────────────────────────────────────────
exports.getRiderPerformance = asyncHandler(async (req, res) => {
  const rider = await Rider.findById(req.params.id)
    .populate('user', 'name phone')
    .lean({ virtuals: true });

  if (!rider) return res.status(404).json({ success: false, error: 'Rider not found' });

  // Last 30 days deliveries
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [deliveryStats, recentDeliveries] = await Promise.all([
    Order.aggregate([
      { $match: { rider: rider._id, status: 'delivered', deliveredAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          avgRating: { $avg: '$rating' },
          totalEarnings: { $sum: 30 }, // ₹30 per delivery
        },
      },
    ]),
    Order.find({ rider: rider._id, status: 'delivered' })
      .sort({ deliveredAt: -1 })
      .limit(5)
      .select('orderId grandTotal deliveredAt rating')
      .lean(),
  ]);

  const stats = deliveryStats[0] || { total: 0, avgRating: 0, totalEarnings: 0 };

  res.status(200).json({
    success: true,
    data: {
      rider: { name: rider.user.name, phone: rider.user.phone, status: rider.status },
      lifetime: {
        totalDeliveries: rider.totalDeliveries,
        rating: rider.rating,
        onTimePercentage: rider.onTimePercentage,
        earnings: rider.earnings,
      },
      last30Days: {
        deliveries: stats.total,
        avgRating: parseFloat((stats.avgRating || 0).toFixed(1)),
        earnings: stats.totalEarnings,
      },
      recentDeliveries,
    },
  });
});

// ════════════════════════════════════════════════════════════════════
//  COUPON MANAGEMENT
// ════════════════════════════════════════════════════════════════════

exports.createCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.create(req.body);
  res.status(201).json({ success: true, message: 'Coupon created', data: coupon });
});

exports.getCoupons = asyncHandler(async (req, res) => {
  const { isActive, page = 1, limit = 20 } = req.query;
  const query = {};
  if (isActive !== undefined) query.isActive = isActive === 'true';

  const skip = (Number(page) - 1) * Number(limit);
  const [coupons, totalItems] = await Promise.all([
    Coupon.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).select('-usedBy -__v').lean(),
    Coupon.countDocuments(query),
  ]);

  res.status(200).json({ success: true, ...paginatedResponse(coupons, page, limit, totalItems) });
});

exports.updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, {
    new: true, runValidators: true,
  }).select('-usedBy -__v');

  if (!coupon) return res.status(404).json({ success: false, error: 'Coupon not found' });
  res.status(200).json({ success: true, message: 'Coupon updated', data: coupon });
});

exports.deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!coupon) return res.status(404).json({ success: false, error: 'Coupon not found' });
  res.status(200).json({ success: true, message: 'Coupon deactivated' });
});

// ════════════════════════════════════════════════════════════════════
//  USER MANAGEMENT
// ════════════════════════════════════════════════════════════════════

exports.getAllUsers = asyncHandler(async (req, res) => {
  const { role, isActive, page = 1, limit = 20, search } = req.query;
  const query = {};
  if (role) query.role = role;
  if (isActive !== undefined) query.isActive = isActive === 'true';
  if (search) query.$or = [
    { name: { $regex: search, $options: 'i' } },
    { phone: { $regex: search } },
  ];

  const skip = (Number(page) - 1) * Number(limit);
  const [users, totalItems] = await Promise.all([
    User.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).select('-__v -addresses').lean(),
    User.countDocuments(query),
  ]);

  res.status(200).json({ success: true, ...paginatedResponse(users, page, limit, totalItems) });
});

exports.toggleUserStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });
  if (user.role === 'admin') {
    return res.status(403).json({ success: false, error: 'Cannot block admin accounts' });
  }

  user.isActive = !user.isActive;
  await user.save();

  res.status(200).json({
    success: true,
    message: `User ${user.isActive ? 'unblocked ✅' : 'blocked 🚫'}`,
    data: { userId: user._id, isActive: user.isActive },
  });
});

// ════════════════════════════════════════════════════════════════════
//  ANALYTICS
// ════════════════════════════════════════════════════════════════════

// ────────────────────────────────────────────────────────────────────
// @desc   Full analytics report
// @route  GET /api/admin/analytics?period=7d|30d|90d
// @access Private/Admin
// ────────────────────────────────────────────────────────────────────
exports.getAnalytics = asyncHandler(async (req, res) => {
  const { period = '7d' } = req.query;
  const days = { '7d': 7, '30d': 30, '90d': 90 }[period] || 7;
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [
    revenueByDay,
    ordersByStatus,
    topProducts,
    categoryRevenue,
    paymentMethodSplit,
  ] = await Promise.all([
    // Revenue trend
    Order.aggregate([
      { $match: { createdAt: { $gte: startDate }, status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$grandTotal' },
          orders: { $sum: 1 },
          avgOrderValue: { $avg: '$grandTotal' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    // Orders by status
    Order.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $project: { status: '$_id', count: 1, _id: 0 } },
    ]),
    // Top 10 selling products
    Order.aggregate([
      { $match: { createdAt: { $gte: startDate }, status: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.name' },
          totalSold: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 },
      { $project: { _id: 0, productId: '$_id', name: 1, totalSold: 1, revenue: 1 } },
    ]),
    // Category-wise revenue
    Order.aggregate([
      { $match: { createdAt: { $gte: startDate }, status: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productInfo',
        },
      },
      { $unwind: { path: '$productInfo', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$productInfo.category',
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          orderCount: { $sum: 1 },
        },
      },
      { $project: { category: '$_id', revenue: 1, orderCount: 1, _id: 0 } },
      { $sort: { revenue: -1 } },
    ]),
    // Payment method split
    Order.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: '$paymentMethod', count: { $sum: 1 }, revenue: { $sum: '$grandTotal' } } },
      { $project: { method: '$_id', count: 1, revenue: 1, _id: 0 } },
    ]),
  ]);

  res.status(200).json({
    success: true,
    period,
    data: {
      revenueByDay,
      ordersByStatus,
      topProducts,
      categoryRevenue,
      paymentMethodSplit,
    },
  });
});
