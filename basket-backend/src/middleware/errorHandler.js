const logger = require('../utils/logger');

/**
 * Global Error Handler — must have exactly 4 params for Express to recognize it
 * Handles Mongoose, JWT, and general errors with proper HTTP status codes
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';

  // Log full error details
  logger.error({
    message,
    statusCode,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  // Mongoose: Bad ObjectId (e.g. /products/invalid-id)
  if (err.name === 'CastError') {
    statusCode = 404;
    message = `Resource not found`;
  }

  // Mongoose: Duplicate key (e.g. duplicate phone number)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    statusCode = 400;
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
  }

  // Mongoose: Validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
  }

  // JWT: Invalid token
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token. Please log in again.';
  }

  // JWT: Expired token
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Session expired. Please log in again.';
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    // Only expose stack trace in development
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

/**
 * 404 Handler — catches any request that didn't match a defined route
 */
const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

module.exports = { errorHandler, notFound };
