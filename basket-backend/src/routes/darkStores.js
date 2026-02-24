const express = require('express');
const router = express.Router();
const {
  getDarkStores, getNearestDarkStore, getDarkStore,
  createDarkStore, updateDarkStore, toggleOperational,
} = require('../controllers/darkStoreController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const { validate, schemas } = require('../middleware/validator');

// Specific routes BEFORE /:id
router.get('/nearest', getNearestDarkStore);
router.get('/', getDarkStores);
router.get('/:id', getDarkStore);

// Admin routes
router.post('/', protect, authorize('admin'), validate(schemas.createDarkStore), createDarkStore);
router.put('/:id', protect, authorize('admin'), updateDarkStore);
router.patch('/:id/toggle', protect, authorize('admin'), toggleOperational);

module.exports = router;
