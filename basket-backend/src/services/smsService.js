const axios  = require('axios');
const logger = require('../utils/logger');

const FAST2SMS_URL = 'https://www.fast2sms.com/dev/bulkV2';

/**
 * Send OTP via Fast2SMS OTP route
 * In development → skips SMS entirely, logs OTP to terminal
 * In production  → calls Fast2SMS API
 *
 * @param {string} phone - 10-digit phone number
 * @param {string} otp   - 6-digit OTP string
 */
const sendOTP = async (phone, otp) => {
  // ── DEV MODE: Skip SMS, just log OTP to terminal ─────────────────
  if (process.env.NODE_ENV === 'development') {
    logger.info('─'.repeat(45));
    logger.info(`🔐 DEV OTP | Phone: ${phone} | OTP: ${otp}`);
    logger.info('─'.repeat(45));
    return { success: true, devMode: true };
  }

  // ── PRODUCTION: Call Fast2SMS ─────────────────────────────────────
  try {
    const response = await axios({
      method:  'GET',
      url:     FAST2SMS_URL,
      params: {
        authorization:   process.env.FAST2SMS_API_KEY,
        route:           'otp',
        variables_values: otp,
        flash:           0,
        numbers:         phone,
      },
      headers: { 'Cache-Control': 'no-cache' },
      timeout: 10000,
    });

    if (response.data?.return === true) {
      logger.info(`OTP dispatched → +91${phone.slice(0, 4)}****${phone.slice(-2)}`);
      return { success: true, requestId: response.data.request_id };
    }

    logger.error(`Fast2SMS failure: ${JSON.stringify(response.data)}`);
    throw new Error('SMS gateway rejected the request');

  } catch (error) {
    if (error.response) {
      logger.error(`Fast2SMS HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`);
    } else {
      logger.error(`SMS service error: ${error.message}`);
    }
    throw new Error('Failed to send OTP. Please try again.');
  }
};

module.exports = { sendOTP };
