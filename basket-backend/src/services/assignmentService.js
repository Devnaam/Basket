const Rider = require('../models/Rider');
const Order = require('../models/Order');
const {
  broadcastNewOrderToRiders,
  emitToRider,
  emitOrderStatusUpdate,
  emitNoRiderAvailable,
} = require('../socket/emitters');
const logger = require('../utils/logger');

// ── In-memory timer store for pending auto-assignments ────────────────
// orderId (string) → NodeJS.Timeout
const pendingAssignments = new Map();

const AUTO_ASSIGN_TIMEOUT_MS = 30000; // 30 seconds

// ────────────────────────────────────────────────────────────────────
// Schedule auto-assignment for a new order
// Called from orderController after order creation
// ────────────────────────────────────────────────────────────────────
const scheduleAutoAssignment = (orderId, darkStoreId, orderData) => {
  // Broadcast new order to all available riders in the dark store
  broadcastNewOrderToRiders(darkStoreId.toString(), {
    orderId: orderData.orderId,
    _id: orderId.toString(),
    grandTotal: orderData.grandTotal,
    itemCount: orderData.itemCount,
    paymentMethod: orderData.paymentMethod,
    estimatedDeliveryTime: orderData.estimatedDeliveryTime,
  });

  logger.info(`Auto-assignment scheduled for order ${orderData.orderId} (${AUTO_ASSIGN_TIMEOUT_MS / 1000}s timeout)`);

  // Start 30-second fallback timer
  const timer = setTimeout(async () => {
    pendingAssignments.delete(orderId.toString());
    await runAutoAssignment(orderId, darkStoreId, orderData.orderId);
  }, AUTO_ASSIGN_TIMEOUT_MS);

  pendingAssignments.set(orderId.toString(), timer);
};

// ────────────────────────────────────────────────────────────────────
// Cancel auto-assignment (called when a rider manually accepts)
// ────────────────────────────────────────────────────────────────────
const cancelAutoAssignment = (orderId) => {
  const timer = pendingAssignments.get(orderId.toString());
  if (timer) {
    clearTimeout(timer);
    pendingAssignments.delete(orderId.toString());
    logger.info(`Auto-assignment timer cancelled for order ${orderId}`);
  }
};

// ────────────────────────────────────────────────────────────────────
// Internal: Run auto-assignment when timeout fires
// ────────────────────────────────────────────────────────────────────
const runAutoAssignment = async (orderId, darkStoreId, formattedOrderId) => {
  try {
    // Re-check if order still needs assignment
    const order = await Order.findById(orderId).populate('user', 'fcmToken name');

    if (!order || order.status !== 'placed' || order.rider) {
      logger.info(`Auto-assignment skipped for ${formattedOrderId} — already handled`);
      return;
    }

    // Find best available rider:
    // Criteria: highest rating, then fewest total deliveries (workload balancing)
    const rider = await Rider.findOne({
      darkStore: darkStoreId,
      status: 'available',
      isActive: true,
    })
      .sort({ rating: -1, totalDeliveries: 1 })
      .populate('user', 'name phone fcmToken');

    if (!rider) {
      logger.warn(`⚠️ No available rider for order ${formattedOrderId} — admin intervention required`);
      emitNoRiderAvailable(orderId.toString(), formattedOrderId);
      return;
    }

    // Assign rider atomically
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: orderId, status: 'placed', rider: null },
      { rider: rider._id, status: 'packing' },
      { new: true }
    );

    if (!updatedOrder) {
      logger.info(`Auto-assignment race condition avoided for ${formattedOrderId}`);
      return;
    }

    // Update rider
    rider.status = 'busy';
    rider.currentOrder = orderId;
    await rider.save();

    logger.info(`🤖 Auto-assigned rider ${rider.user.name} to order ${formattedOrderId}`);

    // Emit to rider's socket room
    emitToRider(rider.user._id.toString(), 'order:auto_assigned', {
      orderId: updatedOrder.orderId,
      _id: orderId.toString(),
      message: 'You have been auto-assigned a new order!',
    });

    // Emit status update to customer + admin
    emitOrderStatusUpdate(orderId.toString(), {
      status: 'packing',
      message: 'A rider has been assigned to your order',
      rider: { name: rider.user.name, phone: rider.user.phone },
    });
  } catch (error) {
    logger.error(`Auto-assignment error for ${formattedOrderId}: ${error.message}`);
  }
};

// ── Cleanup on server shutdown ────────────────────────────────────────
const clearAllAssignments = () => {
  pendingAssignments.forEach((timer) => clearTimeout(timer));
  pendingAssignments.clear();
  logger.info('All pending assignment timers cleared');
};

module.exports = {
  scheduleAutoAssignment,
  cancelAutoAssignment,
  clearAllAssignments,
};
