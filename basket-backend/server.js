require('dotenv').config();

const http = require('http');
const app = require('./src/app');
const connectDB = require('./src/config/database');
const { connectRedis } = require('./src/config/redis');
const { configureCloudinary } = require('./src/config/cloudinary');
const { configureRazorpay } = require('./src/config/razorpay');
const { initializeSocket } = require('./src/socket/socketManager');
const { clearAllAssignments } = require('./src/services/assignmentService');
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 5000;

// ── HTTP Server (shared by Express + Socket.io) ───────────────────────
const httpServer = http.createServer(app);

const startServer = async () => {
  try {
    await connectDB();
    await connectRedis();
    configureCloudinary();
    configureRazorpay();

    // ── Socket.io — must init after all configs ────────────────────
    initializeSocket(httpServer);

    // ── Start Listening ────────────────────────────────────────────
    httpServer.listen(PORT, () => {
      logger.info(`
────────────────────────────────────────
  🛒  Basket API Server Started
────────────────────────────────────────
  Env      : ${process.env.NODE_ENV || 'development'}
  Port     : ${PORT}
  API      : http://localhost:${PORT}/api
  Health   : http://localhost:${PORT}/health
  Sockets  : ws://localhost:${PORT}
────────────────────────────────────────`);
    });

    // ── Graceful Shutdown ──────────────────────────────────────────
    const gracefulShutdown = (signal) => {
      logger.info(`${signal} received — shutting down gracefully...`);
      clearAllAssignments(); // Cancel all pending rider assignment timers
      httpServer.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
      setTimeout(() => {
        logger.error('Forced exit after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    logger.error(`❌ Server startup failed: ${error.message}`);
    process.exit(1);
  }
};

// ── Process-level Error Guards ────────────────────────────────────────
process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled Rejection: ${reason}`);
  httpServer.close(() => process.exit(1));
});

process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`);
  process.exit(1);
});

startServer();
