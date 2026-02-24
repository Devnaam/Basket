const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

const orderHandler = require('./handlers/orderHandler');
const riderHandler = require('./handlers/riderHandler');
const adminHandler = require('./handlers/adminHandler');

let io = null;

// ── Socket.io auth middleware ─────────────────────────────────────────
const socketAuthMiddleware = async (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('name phone role isActive');

    if (!user || !user.isActive) {
      return next(new Error('User not found or inactive'));
    }

    // Attach user info to socket instance
    socket.data.userId = user._id.toString();
    socket.data.role = user.role;
    socket.data.name = user.name;
    socket.data.phone = user.phone;

    next();
  } catch (error) {
    logger.warn(`Socket auth failed: ${error.message}`);
    next(new Error('Invalid or expired token'));
  }
};

// ── Initialize Socket.io ──────────────────────────────────────────────
const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: [
        process.env.FRONTEND_URL,
        'http://localhost:5173',
        'http://localhost:4173',
      ].filter(Boolean),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
  });

  // Apply auth middleware to all namespaces
  io.use(socketAuthMiddleware);

  // ── Connection Handler ─────────────────────────────────────────────
  io.on('connection', (socket) => {
    const { userId, role, name } = socket.data;
    logger.info(`🔌 Socket connected — User: ${name} (${role}) | ID: ${socket.id}`);

    // Auto-join role-based room
    socket.join(`user:${userId}`);

    if (role === 'admin') {
      socket.join('admin');
      logger.info(`👑 Admin ${name} joined admin room`);
    }

    // Register event handlers by role
    orderHandler(io, socket);
    if (role === 'rider' || role === 'admin') {
      riderHandler(io, socket);
    }
    if (role === 'admin') {
      adminHandler(io, socket);
    }

    // ── Disconnect ───────────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      logger.info(`🔌 Socket disconnected — User: ${name} | Reason: ${reason}`);
    });

    socket.on('error', (error) => {
      logger.error(`Socket error for ${name}: ${error.message}`);
    });
  });

  logger.info('✅ Socket.io initialized');
  return io;
};

// ── Singleton getter ──────────────────────────────────────────────────
const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized. Call initializeSocket() first.');
  }
  return io;
};

// ── Safe getter (no-throw, for optional emissions) ────────────────────
const getIOSafe = () => io;

module.exports = { initializeSocket, getIO, getIOSafe };
