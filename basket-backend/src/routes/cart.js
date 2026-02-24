const express = require('express');
const router = express.Router();
const {
  getCart, addToCart, updateCartItem,
  removeFromCart, clearCart, getCartCount,
} = require('../controllers/cartController');
const { protect } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validator');

// All cart routes require authentication
router.use(protect);

router.get('/', getCart);
router.get('/count', getCartCount);
router.post('/add', validate(schemas.addToCart), addToCart);
router.put('/update/:productId', validate(schemas.updateCart), updateCartItem);
router.delete('/remove/:productId', removeFromCart);
router.delete('/clear', clearCart);

module.exports = router;
