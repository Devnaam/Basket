const { createClient } = require('redis');
const logger = require('../utils/logger');

let redisClient;

const connectRedis = async () => {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        // Exponential backoff reconnect strategy — max 3 seconds between retries
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis: Max reconnection attempts reached');
            return new Error('Redis max retries exceeded');
          }
          return Math.min(retries * 100, 3000);
        },
        connectTimeout: 10000,
        tls: process.env.REDIS_URL?.startsWith('rediss://'), // Auto-enable TLS for Redis Cloud
      },
    });

    redisClient.on('connect', () => logger.info('🔄 Redis connecting...'));
    redisClient.on('ready', () => logger.info('✅ Redis client ready'));
    redisClient.on('error', (err) => logger.error(`Redis error: ${err.message}`));
    redisClient.on('reconnecting', () => logger.warn('Redis reconnecting...'));
    redisClient.on('end', () => logger.warn('Redis connection closed'));

    await redisClient.connect();

    // Verify connection
    const pong = await redisClient.ping();
    logger.info(`✅ Redis PING → ${pong}`);

    return redisClient;
  } catch (error) {
    logger.error(`❌ Redis connection failed: ${error.message}`);
    throw error;
  }
};

const getRedisClient = () => {
  if (!redisClient || !redisClient.isReady) {
    throw new Error('Redis client not ready. Ensure connectRedis() was called.');
  }
  return redisClient;
};

// ── Centralized Key Builders & TTLs ──────────────────────────────────
const REDIS_KEYS = {
  otp: (phone) => `otp:${phone}`,
  cart: (userId) => `cart:${userId}`,
  refreshToken: (userId) => `refresh:${userId}`,
  productCache: (queryHash) => `products:${queryHash}`,
  riderLocation: (riderId) => `rider:loc:${riderId}`,
  orderStatus: (orderId) => `order:status:${orderId}`,
};

const REDIS_TTL = {
  OTP: 300,                  // 5 minutes
  CART: 86400,               // 24 hours
  REFRESH_TOKEN: 604800,     // 7 days
  PRODUCT_CACHE: 3600,       // 1 hour
  RIDER_LOCATION: 30,        // 30 seconds (live GPS)
  ORDER_STATUS: 3600,        // 1 hour
};

module.exports = { connectRedis, getRedisClient, REDIS_KEYS, REDIS_TTL };
