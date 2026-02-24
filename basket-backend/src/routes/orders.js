const express = require('express');
const router = express.Router();
const {
  createOrder, getOrderHistory, trackOrder,
  getOrder, cancelOrder, rateOrder,
} = require('../controllers/orderController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const { validate, schemas } = require('../middleware/validator');

router.use(protect);

// Specific paths BEFORE /:id
router.get('/track/:orderId', trackOrder);
router.get('/', getOrderHistory);
router.post('/', authorize('customer'), validate(schemas.createOrder), createOrder);
router.get('/:id', getOrder);
router.put('/:id/cancel', cancelOrder);
router.post('/:id/rate', authorize('customer'), rateOrder);

module.exports = router;
