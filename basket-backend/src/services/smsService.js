const axios = require('axios');
const logger = require('../utils/logger');

const FAST2SMS_URL = 'https://www.fast2sms.com/dev/bulkV2';

/**
 * Send OTP via Fast2SMS OTP route
 * No DLT registration needed for OTP route
 * Cost: ~₹0.28-0.35 per SMS
 *
 * @param {string} phone - 10-digit phone number
 * @param {string} otp   - 6-digit OTP string
 */
const sendOTP = async (phone, otp) => {
  try {
    const response = await axios({
      method: 'GET',
      url: FAST2SMS_URL,
      params: {
        authorization: process.env.FAST2SMS_API_KEY,
        route: 'otp',
        variables_values: otp,
        flash: 0,
        numbers: phone,
      },
      headers: { 'Cache-Control': 'no-cache' },
      timeout: 10000, // 10 second timeout
    });

    if (response.data?.return === true) {
      logger.info(`OTP dispatched → +91${phone.slice(0, 4)}****${phone.slice(-2)}`);
      return {
        success: true,
        requestId: response.data.request_id,
      };
    }

    // Fast2SMS returned false — log details but don't expose to user
    logger.error(`Fast2SMS failure: ${JSON.stringify(response.data)}`);
    throw new Error('SMS gateway rejected the request');
  } catch (error) {
    // Network error or gateway error
    if (error.response) {
      logger.error(`Fast2SMS HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`);
    } else {
      logger.error(`SMS service error: ${error.message}`);
    }
    throw new Error('Failed to send OTP. Please try again.');
  }
};

module.exports = { sendOTP };
