const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');

/**
 * protect — Verifies JWT and attaches req.user
 * Use on any route that requires the user to be logged in
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access denied. Please log in to continue.',
    });
  }

  // jwt.verify throws JsonWebTokenError / TokenExpiredError → caught by asyncHandler → errorHandler
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  const user = await User.findById(decoded.userId).select('-__v');

  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'User not found. Token is no longer valid.',
    });
  }

  if (!user.isActive) {
    return res.status(403).json({
      success: false,
      error: 'Your account has been deactivated. Contact support.',
    });
  }

  req.user = user;
  next();
});

/**
 * optionalAuth — Does NOT fail if no token.
 * Attaches req.user if token is valid, otherwise req.user = null
 * Use for guest-browsable routes (e.g. product listing)
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  req.user = null;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.userId).select('-__v');
    } catch {
      req.user = null; // Invalid/expired token treated as guest
    }
  }

  next();
});

module.exports = { protect, optionalAuth };
