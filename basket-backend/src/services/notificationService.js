const logger = require('../utils/logger');

/**
 * Notification Service
 * Phase 9 will wire FCM credentials and activate real push notifications.
 * All methods are safe to call now — they log intent and resolve cleanly.
 */

const NOTIFICATION_TYPES = {
  ORDER_PLACED: 'order_placed',
  ORDER_PACKING: 'order_packing',
  ORDER_OUT_FOR_DELIVERY: 'order_out_for_delivery',
  ORDER_DELIVERED: 'order_delivered',
  ORDER_CANCELLED: 'order_cancelled',
  ORDER_ASSIGNED: 'order_assigned',
  LOW_STOCK: 'low_stock',
  NEW_OFFER: 'new_offer',
};

/**
 * Send push notification to a single device via FCM token
 */
const sendPushNotification = async (fcmToken, title, body, data = {}) => {
  if (!fcmToken) return;

  // TODO (Phase 9): Initialize Firebase Admin SDK and send via messaging.send()
  logger.info(`[NOTIFICATION] → Token: ${fcmToken.slice(0, 12)}... | ${title}: ${body}`);

  // Placeholder — will return FCM message ID in Phase 9
  return { success: true, messageId: `dev_${Date.now()}` };
};

/**
 * Notify customer about order status update
 */
const notifyOrderStatus = async (user, orderId, status) => {
  const messages = {
    placed:            { title: '🛒 Order Placed!',          body: `Your order ${orderId} is confirmed and being prepared.` },
    packing:           { title: '📦 Packing Your Order',     body: `We are carefully packing your order ${orderId}.` },
    out_for_delivery:  { title: '🏍️ Out for Delivery!',     body: `Your order ${orderId} is on its way!` },
    delivered:         { title: '✅ Order Delivered!',        body: `Enjoy your order! Rate your experience.` },
    cancelled:         { title: '❌ Order Cancelled',         body: `Your order ${orderId} has been cancelled.` },
  };

  const msg = messages[status];
  if (!msg || !user?.fcmToken) return;

  return sendPushNotification(user.fcmToken, msg.title, msg.body, {
    type: NOTIFICATION_TYPES[`ORDER_${status.toUpperCase()}`],
    orderId,
  });
};

/**
 * Notify rider of a new order assignment
 */
const notifyRiderNewOrder = async (rider, order) => {
  if (!rider?.user?.fcmToken) return;
  return sendPushNotification(
    rider.user.fcmToken,
    '🛒 New Order Assigned!',
    `Pickup from dark store. Deliver to customer. ₹${order.grandTotal}`,
    { type: NOTIFICATION_TYPES.ORDER_ASSIGNED, orderId: order.orderId }
  );
};

/**
 * Send low stock alert (admin — could be email/SMS in Phase 9)
 */
const notifyLowStock = async (productName, stock) => {
  logger.warn(`[LOW STOCK ALERT] "${productName}" has only ${stock} units remaining`);
};

module.exports = {
  sendPushNotification,
  notifyOrderStatus,
  notifyRiderNewOrder,
  notifyLowStock,
  NOTIFICATION_TYPES,
};
