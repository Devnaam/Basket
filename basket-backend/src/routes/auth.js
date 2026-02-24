const express = require('express');
const router = express.Router();
const {
  sendOTPHandler,
  verifyOTPHandler,
  refreshTokenHandler,
  logoutHandler,
  getMeHandler,
  updateProfileHandler,
  addAddressHandler,
  deleteAddressHandler,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

// ── Public Routes ─────────────────────────────────────────────────────
router.post('/send-otp', authLimiter, sendOTPHandler);
router.post('/verify-otp', authLimiter, verifyOTPHandler);
router.post('/refresh-token', refreshTokenHandler);

// ── Protected Routes ──────────────────────────────────────────────────
router.post('/logout', protect, logoutHandler);
router.get('/me', protect, getMeHandler);
router.put('/profile', protect, updateProfileHandler);
router.post('/address', protect, addAddressHandler);
router.delete('/address/:addressId', protect, deleteAddressHandler);

module.exports = router;
