const DarkStore = require('../models/DarkStore');
const asyncHandler = require('../utils/asyncHandler');

// ────────────────────────────────────────────────────────────────────
// @desc   Get all dark stores
// @route  GET /api/dark-stores
// @access Public
// ────────────────────────────────────────────────────────────────────
exports.getDarkStores = asyncHandler(async (_req, res) => {
  const stores = await DarkStore.find().select('-__v').lean();
  res.status(200).json({ success: true, count: stores.length, data: stores });
});

// ────────────────────────────────────────────────────────────────────
// @desc   Find nearest operational dark store by GPS coordinates
// @route  GET /api/dark-stores/nearest?lat=X&lng=Y
// @access Public
// ────────────────────────────────────────────────────────────────────
exports.getNearestDarkStore = asyncHandler(async (req, res) => {
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ success: false, error: 'lat and lng query params are required' });
  }

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);

  if (isNaN(latitude) || isNaN(longitude)) {
    return res.status(400).json({ success: false, error: 'lat and lng must be valid numbers' });
  }

  const store = await DarkStore.findNearest(longitude, latitude);

  if (!store) {
    return res.status(404).json({
      success: false,
      error: 'No dark store currently serves your location. We are expanding soon!',
    });
  }

  res.status(200).json({ success: true, data: store });
});

// ────────────────────────────────────────────────────────────────────
// @desc   Get single dark store
// @route  GET /api/dark-stores/:id
// @access Public
// ────────────────────────────────────────────────────────────────────
exports.getDarkStore = asyncHandler(async (req, res) => {
  const store = await DarkStore.findById(req.params.id).select('-__v');
  if (!store) {
    return res.status(404).json({ success: false, error: 'Dark store not found' });
  }
  res.status(200).json({ success: true, data: store });
});

// ────────────────────────────────────────────────────────────────────
// @desc   Create dark store
// @route  POST /api/dark-stores
// @access Private/Admin
// ────────────────────────────────────────────────────────────────────
exports.createDarkStore = asyncHandler(async (req, res) => {
  const store = await DarkStore.create(req.body);
  res.status(201).json({ success: true, message: 'Dark store created', data: store });
});

// ────────────────────────────────────────────────────────────────────
// @desc   Update dark store
// @route  PUT /api/dark-stores/:id
// @access Private/Admin
// ────────────────────────────────────────────────────────────────────
exports.updateDarkStore = asyncHandler(async (req, res) => {
  const store = await DarkStore.findByIdAndUpdate(req.params.id, req.body, {
    new: true, runValidators: true,
  }).select('-__v');

  if (!store) return res.status(404).json({ success: false, error: 'Dark store not found' });
  res.status(200).json({ success: true, message: 'Dark store updated', data: store });
});

// ────────────────────────────────────────────────────────────────────
// @desc   Toggle dark store operational status
// @route  PATCH /api/dark-stores/:id/toggle
// @access Private/Admin
// ────────────────────────────────────────────────────────────────────
exports.toggleOperational = asyncHandler(async (req, res) => {
  const store = await DarkStore.findById(req.params.id);
  if (!store) return res.status(404).json({ success: false, error: 'Dark store not found' });

  store.isOperational = !store.isOperational;
  await store.save();

  res.status(200).json({
    success: true,
    message: `Store is now ${store.isOperational ? 'operational' : 'closed'}`,
    data: { _id: store._id, name: store.name, isOperational: store.isOperational },
  });
});
