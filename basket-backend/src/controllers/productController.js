const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const { getRedisClient, REDIS_KEYS, REDIS_TTL } = require('../config/redis');
const { paginatedResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

// ── Internal: Invalidate all product caches on write ops ──────────────
const invalidateProductCache = async () => {
  try {
    const redis = getRedisClient();
    const keys = await redis.keys('products:*');
    if (keys.length > 0) await redis.del(keys);
    logger.info(`Product cache invalidated (${keys.length} keys removed)`);
  } catch (err) {
    logger.warn(`Cache invalidation failed: ${err.message}`);
  }
};

// ────────────────────────────────────────────────────────────────────
// @desc   Get all products with filters, pagination & caching
// @route  GET /api/products
// @access Public
// ────────────────────────────────────────────────────────────────────
exports.getProducts = asyncHandler(async (req, res) => {
  const {
    category, subcategory, search,
    minPrice, maxPrice,
    inStock, sort = 'createdAt', order = 'desc',
    page = 1, limit = 20,
    darkStore, tags,
  } = req.query;

  // Build cache key
  const cacheKey = REDIS_KEYS.productCache(
    Buffer.from(JSON.stringify(req.query)).toString('base64')
  );

  // Check Redis cache
  try {
    const redis = getRedisClient();
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.status(200).json({ success: true, fromCache: true, ...JSON.parse(cached) });
    }
  } catch (err) {
    logger.warn(`Product cache read error: ${err.message}`);
  }

  // Build query
  const query = { isActive: true };

  if (category) query.category = category;
  if (subcategory) query.subcategory = subcategory;
  if (darkStore) query.darkStore = darkStore;
  if (tags) query.tags = { $in: tags.split(',') };
  if (inStock === 'true') query.stock = { $gt: 0 };

  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }

  if (search) {
    query.$text = { $search: search };
  }

  const skip = (Number(page) - 1) * Number(limit);
  const sortField = ['price', 'createdAt', 'name', 'stock'].includes(sort) ? sort : 'createdAt';
  const sortObj = { [sortField]: order === 'asc' ? 1 : -1 };

  const [products, totalItems] = await Promise.all([
    Product.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(Number(limit))
      .select('-__v')
      .lean({ virtuals: true }),
    Product.countDocuments(query),
  ]);

  const responseData = paginatedResponse(products, page, limit, totalItems);

  // Store in cache
  try {
    const redis = getRedisClient();
    await redis.setEx(cacheKey, REDIS_TTL.PRODUCT_CACHE, JSON.stringify(responseData));
  } catch (err) {
    logger.warn(`Product cache write error: ${err.message}`);
  }

  res.status(200).json({ success: true, fromCache: false, ...responseData });
});

// ────────────────────────────────────────────────────────────────────
// @desc   Full-text product search
// @route  GET /api/products/search?q=keyword
// @access Public
// ────────────────────────────────────────────────────────────────────
exports.searchProducts = asyncHandler(async (req, res) => {
  const { q, page = 1, limit = 20 } = req.query;

  if (!q || q.trim().length < 2) {
    return res.status(400).json({ success: false, error: 'Search query must be at least 2 characters' });
  }

  const query = {
    $text: { $search: q.trim() },
    isActive: true,
  };

  const skip = (Number(page) - 1) * Number(limit);

  const [products, totalItems] = await Promise.all([
    Product.find(query, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } })
      .skip(skip)
      .limit(Number(limit))
      .select('-__v')
      .lean({ virtuals: true }),
    Product.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    query: q,
    ...paginatedResponse(products, page, limit, totalItems),
  });
});

// ────────────────────────────────────────────────────────────────────
// @desc   Get all categories with product count
// @route  GET /api/products/categories
// @access Public
// ────────────────────────────────────────────────────────────────────
exports.getCategories = asyncHandler(async (_req, res) => {
  const categories = await Product.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $project: { _id: 0, name: '$_id', count: 1 } },
  ]);

  res.status(200).json({ success: true, data: categories });
});

// ────────────────────────────────────────────────────────────────────
// @desc   Get single product by ID
// @route  GET /api/products/:id
// @access Public
// ────────────────────────────────────────────────────────────────────
exports.getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
    .select('-__v')
    .populate('darkStore', 'name address isOperational')
    .lean({ virtuals: true });

  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }

  res.status(200).json({ success: true, data: product });
});

// ────────────────────────────────────────────────────────────────────
// @desc   Add new product
// @route  POST /api/products
// @access Private/Admin
// ────────────────────────────────────────────────────────────────────
exports.addProduct = asyncHandler(async (req, res) => {
  const product = await Product.create(req.body);
  await invalidateProductCache();

  res.status(201).json({
    success: true,
    message: 'Product added successfully',
    data: product,
  });
});

// ────────────────────────────────────────────────────────────────────
// @desc   Update product
// @route  PUT /api/products/:id
// @access Private/Admin
// ────────────────────────────────────────────────────────────────────
exports.updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).select('-__v');

  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }

  await invalidateProductCache();

  res.status(200).json({
    success: true,
    message: 'Product updated successfully',
    data: product,
  });
});

// ────────────────────────────────────────────────────────────────────
// @desc   Soft delete product (sets isActive = false)
// @route  DELETE /api/products/:id
// @access Private/Admin
// ────────────────────────────────────────────────────────────────────
exports.deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );

  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }

  await invalidateProductCache();

  res.status(200).json({ success: true, message: 'Product removed from listing' });
});

// ────────────────────────────────────────────────────────────────────
// @desc   Update stock only (quick admin action)
// @route  PATCH /api/products/:id/stock
// @access Private/Admin
// ────────────────────────────────────────────────────────────────────
exports.updateStock = asyncHandler(async (req, res) => {
  const { stock, operation } = req.body;
  // operation: 'set' (default) | 'add' | 'subtract'

  if (stock === undefined || stock < 0) {
    return res.status(400).json({ success: false, error: 'Valid stock quantity is required' });
  }

  const product = await Product.findById(req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }

  if (operation === 'add') {
    product.stock += Number(stock);
  } else if (operation === 'subtract') {
    if (product.stock < stock) {
      return res.status(400).json({ success: false, error: 'Cannot subtract more than available stock' });
    }
    product.stock -= Number(stock);
  } else {
    product.stock = Number(stock);
  }

  // Reactivate product when stock added back
  if (product.stock > 0) product.isActive = true;
  if (product.stock === 0) product.isActive = false;

  await product.save();
  await invalidateProductCache();

  res.status(200).json({
    success: true,
    message: 'Stock updated successfully',
    data: {
      productId: product._id,
      name: product.name,
      stock: product.stock,
      stockStatus: product.stockStatus,
    },
  });
});

// ────────────────────────────────────────────────────────────────────
// @desc   Get low stock products (Admin alert)
// @route  GET /api/products/low-stock
// @access Private/Admin
// ────────────────────────────────────────────────────────────────────
exports.getLowStockProducts = asyncHandler(async (_req, res) => {
  const products = await Product.find({
    isActive: true,
    $expr: { $lte: ['$stock', '$lowStockThreshold'] },
  })
    .select('name category stock lowStockThreshold unit darkStore')
    .populate('darkStore', 'name')
    .sort({ stock: 1 })
    .lean({ virtuals: true });

  res.status(200).json({
    success: true,
    count: products.length,
    data: products,
  });
});
