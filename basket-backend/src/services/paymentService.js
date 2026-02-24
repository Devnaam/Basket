const crypto = require('crypto');
const { getRazorpayInstance } = require('../config/razorpay');
const logger = require('../utils/logger');

/**
 * Create Razorpay order
 * @param {number} amount - Amount in RUPEES (we convert to paise internally)
 * @param {string} receiptId - Our internal order ID (BSKxxx...)
 * @returns {Object} Razorpay order object
 */
const createRazorpayOrder = async (amount, receiptId) => {
  const razorpay = getRazorpayInstance();

  const options = {
    amount: Math.round(amount * 100), // Razorpay needs paise (₹1 = 100 paise)
    currency: 'INR',
    receipt: receiptId,
    notes: {
      platform: 'Basket',
      orderId: receiptId,
    },
  };

  try {
    const order = await razorpay.orders.create(options);
    logger.info(`Razorpay order created: ${order.id} for ₹${amount}`);
    return order;
  } catch (error) {
    logger.error(`Razorpay order creation failed: ${error.message}`);
    throw new Error('Payment gateway error. Please try again.');
  }
};

/**
 * Verify Razorpay payment signature
 * HMAC-SHA256(razorpayOrderId + "|" + razorpayPaymentId, secret)
 *
 * @param {string} razorpayOrderId  - From Razorpay order creation
 * @param {string} razorpayPaymentId - From Razorpay payment callback
 * @param {string} razorpaySignature - From Razorpay payment callback
 * @returns {boolean}
 */
const verifyPaymentSignature = (razorpayOrderId, razorpayPaymentId, razorpaySignature) => {
  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  const isValid = expectedSignature === razorpaySignature;

  if (!isValid) {
    logger.warn(`Payment signature verification failed for order: ${razorpayOrderId}`);
  }

  return isValid;
};

/**
 * Initiate refund via Razorpay
 * @param {string} paymentId - razorpayPaymentId
 * @param {number} amount - Refund amount in RUPEES (null = full refund)
 */
const initiateRefund = async (paymentId, amount = null) => {
  const razorpay = getRazorpayInstance();

  const refundOptions = {};
  if (amount) {
    refundOptions.amount = Math.round(amount * 100); // paise
  }

  try {
    const refund = await razorpay.payments.refund(paymentId, refundOptions);
    logger.info(`Refund initiated: ${refund.id} for payment ${paymentId}`);
    return refund;
  } catch (error) {
    logger.error(`Refund failed for ${paymentId}: ${error.message}`);
    throw new Error('Refund initiation failed. Please try again.');
  }
};

/**
 * Fetch payment details from Razorpay
 */
const fetchPayment = async (paymentId) => {
  const razorpay = getRazorpayInstance();
  try {
    return await razorpay.payments.fetch(paymentId);
  } catch (error) {
    logger.error(`Fetch payment failed for ${paymentId}: ${error.message}`);
    throw new Error('Failed to fetch payment details');
  }
};

module.exports = {
  createRazorpayOrder,
  verifyPaymentSignature,
  initiateRefund,
  fetchPayment,
};
