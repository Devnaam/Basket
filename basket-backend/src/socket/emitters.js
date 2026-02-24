const { getIOSafe } = require('./socketManager');
const logger = require('../utils/logger');

/**
 * Safe emit helper — silently swallows errors if socket is not ready.
 * This prevents API controllers from crashing if socket is unavailable.
 */
const safeEmit = (fn) => {
  try {
    const io = getIOSafe();
    if (!io) return; // Socket not initialized (e.g. tests)
    fn(io);
  } catch (err) {
    logger.warn(`Socket emit failed: ${err.message}`);
  }
};

// ── Order Emitters ────────────────────────────────────────────────────

/**
 * Emit order status update to:
 * - Customer tracking room (order:{orderId})
 * - Admin dashboard room
 */
const emitOrderStatusUpdate = (orderId, data) => {
  safeEmit((io) => {
    io.to(`order:${orderId}`).to('admin').emit('order:status_updated', {
      orderId,
      ...data,
      timestamp: new Date().toISOString(),
    });
  });
};

/**
 * Emit rider GPS location to customer tracking room
 */
const emitRiderLocation = (orderId, riderId, coordinates) => {
  safeEmit((io) => {
    io.to(`order:${orderId}`).emit('order:rider_location', {
      orderId,
      riderId,
      lat: coordinates.lat,
      lng: coordinates.lng,
      updatedAt: new Date().toISOString(),
    });
  });
};

/**
 * Broadcast new order to all available riders in a dark store
 */
const broadcastNewOrderToRiders = (darkStoreId, orderData) => {
  safeEmit((io) => {
    io.to(`darkstore:${darkStoreId}`).emit('order:new_assignment', {
      ...orderData,
      deadline: new Date(Date.now() + 30000).toISOString(), // 30-second window
    });
  });
};

/**
 * Notify a specific rider of auto-assignment or direct assignment
 */
const emitToRider = (userId, event, data) => {
  safeEmit((io) => {
    io.to(`user:${userId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  });
};

/**
 * Tell all riders in a dark store that an order has been taken
 */
const emitOrderTakenToRiders = (darkStoreId, orderId) => {
  safeEmit((io) => {
    io.to(`darkstore:${darkStoreId}`).emit('order:assignment_taken', { orderId });
  });
};

// ── Admin Emitters ────────────────────────────────────────────────────

/**
 * Send new order to admin live feed
 */
const emitNewOrderToAdmin = (orderData) => {
  safeEmit((io) => {
    io.to('admin').emit('admin:new_order', {
      ...orderData,
      timestamp: new Date().toISOString(),
    });
  });
};

/**
 * Notify admin of order update
 */
const emitOrderUpdateToAdmin = (data) => {
  safeEmit((io) => {
    io.to('admin').emit('admin:order_updated', {
      ...data,
      timestamp: new Date().toISOString(),
    });
  });
};

/**
 * Notify admin that no rider is available for an order
 */
const emitNoRiderAvailable = (orderId, orderIdFormatted) => {
  safeEmit((io) => {
    io.to('admin').emit('admin:no_rider_available', {
      orderId,
      orderIdFormatted,
      message: 'No available rider. Please assign manually.',
      timestamp: new Date().toISOString(),
    });
  });
};

/**
 * Notify admin of rider status change
 */
const emitRiderStatusToAdmin = (riderId, status, name) => {
  safeEmit((io) => {
    io.to('admin').emit('admin:rider_status_changed', { riderId, status, name });
  });
};

/**
 * Notify admin of low stock product
 */
const emitLowStockAlert = (product) => {
  safeEmit((io) => {
    io.to('admin').emit('admin:low_stock', {
      productId: product._id,
      name: product.name,
      stock: product.stock,
      threshold: product.lowStockThreshold,
    });
  });
};

module.exports = {
  emitOrderStatusUpdate,
  emitRiderLocation,
  broadcastNewOrderToRiders,
  emitToRider,
  emitOrderTakenToRiders,
  emitNewOrderToAdmin,
  emitOrderUpdateToAdmin,
  emitNoRiderAvailable,
  emitRiderStatusToAdmin,
  emitLowStockAlert,
};
