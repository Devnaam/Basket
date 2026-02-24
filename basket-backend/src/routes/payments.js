const express = require('express');
const router = express.Router();
const { verifyPayment, processRefund, validateCoupon } = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const { paymentLimiter } = require('../middleware/rateLimiter');

router.use(protect);

router.post('/verify', paymentLimiter, verifyPayment);
router.post('/validate-coupon', validateCoupon);
router.post('/refund', authorize('admin'), processRefund);

module.exports = router;
