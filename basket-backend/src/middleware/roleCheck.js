/**
 * authorize(...roles)
 *
 * Usage in routes:
 *   router.get('/admin/dashboard', protect, authorize('admin'), handler)
 *   router.put('/rider/order', protect, authorize('rider', 'admin'), handler)
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required: ${roles.join(' or ')} | Your role: ${req.user.role}`,
      });
    }

    next();
  };
};

module.exports = { authorize };
