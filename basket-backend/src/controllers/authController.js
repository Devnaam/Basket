const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getRedisClient, REDIS_KEYS, REDIS_TTL } = require('../config/redis');
const { sendOTP } = require('../services/smsService');
const asyncHandler = require('../utils/asyncHandler');
const { generateOTP, sanitizePhone } = require('../utils/helpers');

// ── Internal: Generate JWT access + refresh token pair ────────────────
const generateTokens = (userId, role) => {
  const accessToken = jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '15m' }
  );
  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );
  return { accessToken, refreshToken };
};

// ────────────────────────────────────────────────────────────────────
// @desc    Send OTP to phone number
// @route   POST /api/auth/send-otp
// @access  Public
// ────────────────────────────────────────────────────────────────────
exports.sendOTPHandler = asyncHandler(async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ success: false, error: 'Phone number is required' });
  }

  const cleanPhone = sanitizePhone(phone);

  if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a valid 10-digit Indian phone number',
    });
  }

  const redis = getRedisClient();

  // Prevent OTP spam: check if OTP was sent in last 60 seconds
  const ttl = await redis.ttl(REDIS_KEYS.otp(cleanPhone));
  if (ttl > 0 && ttl > REDIS_TTL.OTP - 60) {
    return res.status(429).json({
      success: false,
      error: `OTP already sent. Please wait ${ttl - (REDIS_TTL.OTP - 60)} seconds before requesting a new one.`,
    });
  }

  const otp = generateOTP();

  // Store OTP in Redis (5-minute TTL)
  await redis.setEx(REDIS_KEYS.otp(cleanPhone), REDIS_TTL.OTP, otp);

  // Send via Fast2SMS (skip in test environment to save credits)
  if (process.env.NODE_ENV !== 'test') {
    await sendOTP(cleanPhone, otp);
  }

  // Print OTP in terminal during development — saves SMS credits
  if (process.env.NODE_ENV === 'development') {
    console.log(`\n${'='.repeat(40)}`);
    console.log(`🔑 DEV OTP for +91${cleanPhone}: ${otp}`);
    console.log(`${'='.repeat(40)}\n`);
  }

  res.status(200).json({
    success: true,
    message: `OTP sent to +91${cleanPhone}. Valid for 5 minutes.`,
    expiresIn: REDIS_TTL.OTP,
    // Expose OTP in response only during development
    ...(process.env.NODE_ENV === 'development' && { otp }),
  });
});

// ────────────────────────────────────────────────────────────────────
// @desc    Verify OTP → Login or Register user
// @route   POST /api/auth/verify-otp
// @access  Public
// ────────────────────────────────────────────────────────────────────
exports.verifyOTPHandler = asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    return res.status(400).json({ success: false, error: 'Phone and OTP are required' });
  }

  const cleanPhone = sanitizePhone(phone);
  const redis = getRedisClient();

  // Retrieve OTP from Redis
  const storedOTP = await redis.get(REDIS_KEYS.otp(cleanPhone));

  if (!storedOTP) {
    return res.status(400).json({
      success: false,
      error: 'OTP has expired or was never sent. Please request a new OTP.',
    });
  }

  if (storedOTP !== otp.toString().trim()) {
    return res.status(400).json({ success: false, error: 'Invalid OTP. Please try again.' });
  }

  // OTP verified — delete it immediately (one-time use)
  await redis.del(REDIS_KEYS.otp(cleanPhone));

  // Find or create user
  let user = await User.findOne({ phone: cleanPhone });
  const isNewUser = !user;

  if (!user) {
    user = await User.create({
      phone: cleanPhone,
      name: 'Basket User', // User can update name in profile
    });
  }

  if (!user.isActive) {
    return res.status(403).json({
      success: false,
      error: 'Your account has been deactivated. Please contact support.',
    });
  }

  // Generate token pair
  const { accessToken, refreshToken } = generateTokens(user._id, user.role);

  // Store refresh token in Redis (7-day TTL)
  await redis.setEx(
    REDIS_KEYS.refreshToken(user._id.toString()),
    REDIS_TTL.REFRESH_TOKEN,
    refreshToken
  );

  res.status(200).json({
    success: true,
    message: isNewUser ? 'Welcome to Basket! 🛒' : 'Login successful!',
    data: {
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email || null,
        role: user.role,
        isNewUser,
        hasAddresses: user.addresses.length > 0,
      },
      accessToken,
      refreshToken,
    },
  });
});

// ────────────────────────────────────────────────────────────────────
// @desc    Refresh access token using refresh token
// @route   POST /api/auth/refresh-token
// @access  Public
// ────────────────────────────────────────────────────────────────────
exports.refreshTokenHandler = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ success: false, error: 'Refresh token is required' });
  }

  // Verify — throws TokenExpiredError or JsonWebTokenError if invalid
  const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

  const redis = getRedisClient();
  const storedToken = await redis.get(REDIS_KEYS.refreshToken(decoded.userId));

  if (!storedToken || storedToken !== refreshToken) {
    return res.status(401).json({
      success: false,
      error: 'Refresh token is invalid or revoked. Please log in again.',
    });
  }

  const user = await User.findById(decoded.userId);
  if (!user || !user.isActive) {
    return res.status(401).json({ success: false, error: 'User not found or inactive' });
  }

  // Issue new access token only — refresh token stays valid
  const accessToken = jwt.sign(
    { userId: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '15m' }
  );

  res.status(200).json({ success: true, data: { accessToken } });
});

// ────────────────────────────────────────────────────────────────────
// @desc    Logout — revoke refresh token
// @route   POST /api/auth/logout
// @access  Private
// ────────────────────────────────────────────────────────────────────
exports.logoutHandler = asyncHandler(async (req, res) => {
  const redis = getRedisClient();
  await redis.del(REDIS_KEYS.refreshToken(req.user._id.toString()));

  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

// ────────────────────────────────────────────────────────────────────
// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
// ────────────────────────────────────────────────────────────────────
exports.getMeHandler = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-__v');
  res.status(200).json({ success: true, data: user });
});

// ────────────────────────────────────────────────────────────────────
// @desc    Update profile (name, email)
// @route   PUT /api/auth/profile
// @access  Private
// ────────────────────────────────────────────────────────────────────
exports.updateProfileHandler = asyncHandler(async (req, res) => {
  const allowed = ['name', 'email', 'fcmToken'];
  const updateData = {};

  allowed.forEach((field) => {
    if (req.body[field] !== undefined) {
      updateData[field] =
        typeof req.body[field] === 'string'
          ? req.body[field].trim()
          : req.body[field];
    }
  });

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ success: false, error: 'No valid fields to update' });
  }

  const user = await User.findByIdAndUpdate(req.user._id, updateData, {
    new: true,
    runValidators: true,
  }).select('-__v');

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: user,
  });
});

// ────────────────────────────────────────────────────────────────────
// @desc    Add a delivery address
// @route   POST /api/auth/address
// @access  Private (customer)
// ────────────────────────────────────────────────────────────────────
exports.addAddressHandler = asyncHandler(async (req, res) => {
  const { label, addressLine, landmark, location, pincode, isDefault } = req.body;

  if (!label || !addressLine || !location?.coordinates || !pincode) {
    return res.status(400).json({
      success: false,
      error: 'label, addressLine, location.coordinates, and pincode are required',
    });
  }

  const user = await User.findById(req.user._id);

  if (user.addresses.length >= 5) {
    return res.status(400).json({
      success: false,
      error: 'Maximum 5 addresses allowed. Please delete one before adding.',
    });
  }

  // If new address is default, remove default from all others
  if (isDefault) {
    user.addresses.forEach((addr) => (addr.isDefault = false));
  }

  user.addresses.push({ label, addressLine, landmark, location, pincode, isDefault: !!isDefault });
  await user.save();

  res.status(201).json({
    success: true,
    message: 'Address added successfully',
    data: user.addresses,
  });
});

// ────────────────────────────────────────────────────────────────────
// @desc    Delete a delivery address
// @route   DELETE /api/auth/address/:addressId
// @access  Private (customer)
// ────────────────────────────────────────────────────────────────────
exports.deleteAddressHandler = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const index = user.addresses.findIndex(
    (addr) => addr._id.toString() === req.params.addressId
  );

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Address not found' });
  }

  user.addresses.splice(index, 1);
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Address deleted successfully',
    data: user.addresses,
  });
});
