/**
 * Async Handler Wrapper
 * Wraps async route handlers to forward errors to Express error middleware.
 * Express 5 auto-propagates promise rejections, but this wrapper keeps
 * our code explicit and compatible with both Express 4 and 5.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
