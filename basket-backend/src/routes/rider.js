const express = require('express');
const router = express.Router();
const {
  getRiderProfile, toggleStatus, getAssignedOrders,
  acceptOrder, updateOrderStatus, updateLocation,
  getEarnings, getDeliveryHistory,
} = require('../controllers/riderController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');

// All rider routes require authentication + rider role
router.use(protect, authorize('rider', 'admin'));

router.get('/profile', getRiderProfile);
router.put('/status', toggleStatus);
router.get('/orders', getAssignedOrders);
router.put('/orders/:id/accept', acceptOrder);
router.put('/orders/:id/status', updateOrderStatus);
router.post('/location', updateLocation);
router.get('/earnings', getEarnings);
router.get('/history', getDeliveryHistory);

module.exports = router;
