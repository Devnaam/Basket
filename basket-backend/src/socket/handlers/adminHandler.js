const logger = require('../../utils/logger');

/**
 * Admin Socket Handler
 * Admin is auto-joined to 'admin' room in socketManager on connect.
 * This handler adds admin-specific socket controls.
 */
module.exports = (io, socket) => {
  const { name } = socket.data;

  // ── Get live socket stats ─────────────────────────────────────────
  socket.on('admin:get_stats', () => {
    const sockets = io.sockets.sockets;
    let onlineRiders = 0;
    let onlineCustomers = 0;
    let onlineAdmins = 0;

    sockets.forEach((s) => {
      if (s.data.role === 'rider') onlineRiders++;
      else if (s.data.role === 'customer') onlineCustomers++;
      else if (s.data.role === 'admin') onlineAdmins++;
    });

    socket.emit('admin:live_stats', {
      totalConnections: sockets.size,
      onlineRiders,
      onlineCustomers,
      onlineAdmins,
    });
  });

  // ── Admin manually join a specific order room to monitor ──────────
  socket.on('admin:monitor_order', ({ orderId }) => {
    if (!orderId) return;
    socket.join(`order:${orderId}`);
    logger.info(`Admin ${name} monitoring order ${orderId}`);
    socket.emit('admin:monitoring_order', { orderId });
  });

  // ── Admin stop monitoring an order ───────────────────────────────
  socket.on('admin:unmonitor_order', ({ orderId }) => {
    if (!orderId) return;
    socket.leave(`order:${orderId}`);
  });
};
