const express = require('express');
const router = express.Router();
const {
  getProducts, searchProducts, getCategories,
  getProduct, addProduct, updateProduct,
  deleteProduct, updateStock, getLowStockProducts,
} = require('../controllers/productController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const { validate, schemas } = require('../middleware/validator');

// ── Public Routes ─────────────────────────────────────────────────────
// NOTE: Specific paths MUST come before /:id to avoid route conflicts
router.get('/search', searchProducts);
router.get('/categories', getCategories);
router.get('/', getProducts);
router.get('/:id', getProduct);

// ── Admin-Only Routes ─────────────────────────────────────────────────
router.get('/admin/low-stock', protect, authorize('admin'), getLowStockProducts);
router.post('/', protect, authorize('admin'), validate(schemas.addProduct), addProduct);
router.put('/:id', protect, authorize('admin'), validate(schemas.updateProduct), updateProduct);
router.delete('/:id', protect, authorize('admin'), deleteProduct);
router.patch('/:id/stock', protect, authorize('admin'), updateStock);

module.exports = router;
