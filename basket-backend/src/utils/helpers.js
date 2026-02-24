const crypto = require('crypto');

/**
 * Generate unique Order ID
 * Format: BSK + YYYYMMDD + 6 random digits
 * Example: BSK20260224482910
 */
const generateOrderId = () => {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(100000 + Math.random() * 900000);
  return `BSK${datePart}${random}`;
};

/**
 * Generate a 6-digit numeric OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Calculate delivery fee
 * Free above ₹500, standard ₹25 below
 */
const calculateDeliveryFee = (orderAmount, isSubscriber = false) => {
  if (isSubscriber) return 0;
  if (orderAmount >= 500) return 0;
  return 25;
};

/**
 * GST breakdown for grocery orders (5% standard)
 */
const calculateGST = (amount, gstRate = 5) => {
  const total = parseFloat(((amount * gstRate) / 100).toFixed(2));
  return {
    cgst: parseFloat((total / 2).toFixed(2)),
    sgst: parseFloat((total / 2).toFixed(2)),
    total,
  };
};

/**
 * Haversine formula — distance between two GPS coordinates (in meters)
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Sanitize Indian phone number — strip country code, return 10 digits
 */
const sanitizePhone = (phone) => {
  const cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return cleaned.slice(2);
  }
  return cleaned;
};

/**
 * Build paginated response envelope
 */
const paginatedResponse = (data, page, limit, totalItems) => ({
  data,
  pagination: {
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(totalItems / limit),
    totalItems,
    hasNextPage: parseInt(page) * parseInt(limit) < totalItems,
    hasPrevPage: parseInt(page) > 1,
  },
});

/**
 * Generate random uppercase alphanumeric string (for coupon codes, etc.)
 */
const generateCode = (length = 8) => {
  return crypto
    .randomBytes(length)
    .toString('hex')
    .toUpperCase()
    .slice(0, length);
};

module.exports = {
  generateOrderId,
  generateOTP,
  calculateDeliveryFee,
  calculateGST,
  calculateDistance,
  sanitizePhone,
  paginatedResponse,
  generateCode,
};
