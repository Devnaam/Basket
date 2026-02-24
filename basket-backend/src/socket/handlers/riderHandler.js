const Rider  = require('../../models/Rider');
const { getRedisClient, REDIS_KEYS, REDIS_TTL } = require('../../config/redis');
const {
  emitRiderStatusToAdmin,
  emitRiderLocation,
  emitOrderTakenToRiders,
} = require('../emitters');
const { cancelAutoAssignment } = require('../../services/assignmentService');
const logger = require('../../utils/logger');

module.exports = (io, socket) => {
  const { userId, name, role } = socket.data;

  // ── Rider goes online — joins their dark store room ───────────────
  socket.on('rider:online', async () => {
    try {
      const rider = await Rider.findOne({ user: userId });
      if (!rider) return;

      socket.join(`darkstore:${rider.darkStore.toString()}`);

      if (rider.status === 'offline') {
        rider.status = 'available';
        await rider.save();
      }

      emitRiderStatusToAdmin(rider._id.toString(), rider.status, name);
      socket.emit('rider:status_confirmed', { status: rider.status });
      logger.info(`Rider ${name} is now online`);
    } catch (err) {
      logger.error(`rider:online error for ${name}: ${err.message}`);
    }
  });

  // ── Rider goes offline ─────────────────────────────────────────────
  socket.on('rider:offline', async () => {
    try {
      const rider = await Rider.findOne({ user: userId });
      if (!rider) return;

      if (rider.currentOrder) {
        socket.emit('error', {
          message: 'Complete your current delivery before going offline',
        });
        return;
      }

      socket.leave(`darkstore:${rider.darkStore.toString()}`);
      rider.status = 'offline';
      await rider.save();

      emitRiderStatusToAdmin(rider._id.toString(), 'offline', name);
      socket.emit('rider:status_confirmed', { status: 'offline' });
      logger.info(`Rider ${name} is now offline`);
    } catch (err) {
      logger.error(`rider:offline error for ${name}: ${err.message}`);
    }
  });

  // ── Real-time GPS location update ─────────────────────────────────
  // ⚠️ Changed from 'rider:location' → 'rider:location_update'
  //    to match Phase 8 useRiderSocket.js frontend emission
  socket.on('rider:location_update', async ({ latitude, longitude }) => {
    try {
      if (!latitude || !longitude) return;

      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (isNaN(lat) || isNaN(lng)) return;

      const rider = await Rider.findOneAndUpdate(
        { user: userId },
        { 'currentLocation.coordinates': [lng, lat] },
        { new: true }
      ).select('_id currentOrder darkStore');

      if (!rider) return;

      // Store in Redis (30s TTL for live tracking)
      const redis = getRedisClient();
      await redis.setEx(
        REDIS_KEYS.riderLocation(rider._id.toString()),
        REDIS_TTL.RIDER_LOCATION,
        JSON.stringify({ lat, lng, updatedAt: new Date().toISOString() })
      );

      // If on an active delivery — broadcast to customer
      if (rider.currentOrder) {
        emitRiderLocation(
          rider.currentOrder.toString(),
          rider._id.toString(),
          { lat, lng }   // ← useSocket.js listens for { lat, lng }
        );
      }
    } catch (_) {
      // Silent fail — location is high-frequency
    }
  });

  // ── Rider accepts order via socket ────────────────────────────────
  socket.on('rider:accept_order', async ({ orderId }) => {
    try {
      if (!orderId) return;

      const Order = require('../../models/Order');
      const rider = await Rider.findOne({ user: userId });

      if (!rider || rider.status !== 'available') {
        socket.emit('order:accept_failed', {
          orderId,
          reason: 'You are not available to accept orders',
        });
        return;
      }

      const order = await Order.findOneAndUpdate(
        { _id: orderId, status: 'placed', rider: null },
        { rider: rider._id, status: 'packing' },
        { new: true }
      ).populate('user', 'name phone fcmToken');

      if (!order) {
        socket.emit('order:accept_failed', {
          orderId,
          reason: 'Order already taken or no longer available',
        });
        return;
      }

      cancelAutoAssignment(orderId);

      rider.status = 'busy';
      rider.currentOrder = order._id;
      await rider.save();

      emitOrderTakenToRiders(rider.darkStore.toString(), order._id.toString());

      socket.emit('order:accepted', {
        orderId:         order.orderId,
        _id:             order._id,
        customer:        { name: order.user.name, phone: order.user.phone },
        items:           order.items,
        deliveryAddress: order.deliveryAddress,
        grandTotal:      order.grandTotal,
        paymentMethod:   order.paymentMethod,
      });

      logger.info(`Rider ${name} accepted order ${order.orderId} via socket`);
    } catch (err) {
      logger.error(`rider:accept_order error: ${err.message}`);
    }
  });

  // ── Auto-rejoin dark store room on reconnect ──────────────────────
  socket.on('rider:rejoin', async () => {
    try {
      const rider = await Rider.findOne({ user: userId });
      if (rider && rider.status !== 'offline') {
        socket.join(`darkstore:${rider.darkStore.toString()}`);
        socket.emit('rider:rejoined', { darkStore: rider.darkStore.toString() });
      }
    } catch (_) {}
  });
};
