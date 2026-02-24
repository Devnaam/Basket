const express = require('express');
const router = express.Router();
const {
  getDashboardMetrics,
  getAllOrders, getOrderDetails, assignRider, cancelOrderAdmin,
  getAllRiders, onboardRider, toggleRiderStatus, getRiderPerformance,
  createCoupon, getCoupons, updateCoupon, deleteCoupon,
  getAllUsers, toggleUserStatus,
  getAnalytics,
} = require('../controllers/adminController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const { validate, schemas } = require('../middleware/validator');

// All admin routes locked to admin role
router.use(protect, authorize('admin'));

// Dashboard
router.get('/dashboard', getDashboardMetrics);
router.get('/analytics', getAnalytics);

// Orders
router.get('/orders', getAllOrders);
router.get('/orders/:id', getOrderDetails);
router.put('/orders/:id/assign-rider', assignRider);
router.put('/orders/:id/cancel', cancelOrderAdmin);

// Riders
router.get('/riders', getAllRiders);
router.post('/riders', onboardRider);
router.get('/riders/:id/performance', getRiderPerformance);
router.patch('/riders/:id/toggle', toggleRiderStatus);

// Coupons
router.get('/coupons', getCoupons);
router.post('/coupons', validate(schemas.createCoupon), createCoupon);
router.put('/coupons/:id', updateCoupon);
router.delete('/coupons/:id', deleteCoupon);

// Users
router.get('/users', getAllUsers);
router.patch('/users/:id/toggle', toggleUserStatus);

module.exports = router;
