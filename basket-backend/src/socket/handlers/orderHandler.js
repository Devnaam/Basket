const logger = require('../../utils/logger');

/**
 * Order Socket Handler
 * Registers events for tracking a specific order in real-time.
 * Any authenticated user can join an order room — the security check
 * happens in the REST controller (only the owner can see order details).
 */
module.exports = (io, socket) => {
  const { userId, role, name } = socket.data;

  // ── Join a specific order's tracking room ─────────────────────────
  socket.on('join:order_room', ({ orderId }) => {
    if (!orderId) return;
    socket.join(`order:${orderId}`);
    logger.info(`User ${name} joined order room: order:${orderId}`);
    socket.emit('joined:order_room', { orderId, message: 'Now tracking order' });
  });

  // ── Leave order tracking room ─────────────────────────────────────
  socket.on('leave:order_room', ({ orderId }) => {
    if (!orderId) return;
    socket.leave(`order:${orderId}`);
    logger.info(`User ${name} left order room: order:${orderId}`);
  });
};
