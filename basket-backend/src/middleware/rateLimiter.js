const { rateLimit } = require('express-rate-limit');
const logger = require('../utils/logger');

// ── General API Limiter (all /api routes) ─────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100,                // v8 syntax: `limit` replaces `max`
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP. Please try again after 15 minutes.',
  },
  handler: (req, res, _next, options) => {
    logger.warn(`Rate limit hit — IP: ${req.ip}, Path: ${req.originalUrl}`);
    res.status(options.statusCode).json(options.message);
  },
  skip: (req) => req.path === '/health', // Skip health check endpoint
});

// ── Auth Limiter (OTP brute-force prevention) ─────────────────────────
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  limit: 5,                  // Max 5 OTP requests per 10 minutes per IP
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many OTP requests. Please wait 10 minutes before trying again.',
  },
  handler: (req, res, _next, options) => {
    logger.warn(`Auth rate limit hit — IP: ${req.ip}, Phone: ${req.body?.phone}`);
    res.status(options.statusCode).json(options.message);
  },
});

// ── Payment Limiter ───────────────────────────────────────────────────
const paymentLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many payment requests. Please wait a moment.',
  },
});

module.exports = { apiLimiter, authLimiter, paymentLimiter };
