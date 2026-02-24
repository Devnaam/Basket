const Razorpay = require('razorpay');
const logger = require('../utils/logger');

let razorpayInstance = null;

const configureRazorpay = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    logger.warn('⚠️  Razorpay credentials missing — payment features disabled');
    return null;
  }

  razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  logger.info('✅ Razorpay configured');
  return razorpayInstance;
};

const getRazorpayInstance = () => {
  if (!razorpayInstance) {
    throw new Error('Razorpay not initialized. Call configureRazorpay() first.');
  }
  return razorpayInstance;
};

module.exports = { configureRazorpay, getRazorpayInstance };
