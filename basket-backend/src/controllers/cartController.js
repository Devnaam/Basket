const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const { getRedisClient, REDIS_KEYS, REDIS_TTL } = require('../config/redis');

// ── Internal: Get cart from Redis ─────────────────────────────────────
const getCartFromRedis = async (userId) => {
  const redis = getRedisClient();
  const raw = await redis.get(REDIS_KEYS.cart(userId));
  return raw ? JSON.parse(raw) : [];
};

// ── Internal: Save cart to Redis ──────────────────────────────────────
const saveCartToRedis = async (userId, items) => {
  const redis = getRedisClient();
  await redis.setEx(
    REDIS_KEYS.cart(userId),
    REDIS_TTL.CART,
    JSON.stringify(items)
  );
};

// ── Internal: Enrich cart items with fresh product data ───────────────
const enrichCartItems = async (cartItems) => {
  if (cartItems.length === 0) return [];

  const productIds = cartItems.map((item) => item.productId);
  const products = await Product.find({
    _id: { $in: productIds },
  })
    .select('name price mrp unit images stock isActive')
    .lean({ virtuals: true });

  const productMap = products.reduce((map, p) => {
    map[p._id.toString()] = p;
    return map;
  }, {});

  return cartItems.map((item) => {
    const product = productMap[item.productId];
    if (!product) return { ...item, isAvailable: false, reason: 'Product no longer exists' };

    return {
      ...item,
      name: product.name,
      price: product.price, // Always use current price
      mrp: product.mrp,
      image: product.images[0] || null,
      unit: product.unit,
      stockStatus: product.stockStatus,
      isAvailable: product.isActive && product.stock >= item.quantity,
      availableStock: product.stock,
      // Price may have changed since added to cart
      priceChanged: product.price !== item.priceAtAdd,
    };
  });
};

// ────────────────────────────────────────────────────────────────────
// @desc   Get user cart (enriched with live product data)
// @route  GET /api/cart
// @access Private
// ────────────────────────────────────────────────────────────────────
exports.getCart = asyncHandler(async (req, res) => {
  const rawCart = await getCartFromRedis(req.user._id.toString());
  const items = await enrichCartItems(rawCart);

  const availableItems = items.filter((i) => i.isAvailable);
  const unavailableItems = items.filter((i) => !i.isAvailable);

  const totalItems = availableItems.reduce((sum, i) => sum + i.quantity, 0);
  const totalAmount = availableItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  res.status(200).json({
    success: true,
    data: {
      items: availableItems,
      unavailableItems,
      totalItems,
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      itemCount: availableItems.length,
    },
  });
});

// ────────────────────────────────────────────────────────────────────
// @desc   Add item to cart (or increment if already exists)
// @route  POST /api/cart/add
// @access Private
// ────────────────────────────────────────────────────────────────────
exports.addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1 } = req.body;

  // Verify product exists and is in stock
  const product = await Product.findById(productId).select(
    'name price mrp unit images stock isActive'
  ).lean({ virtuals: true });

  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }
  if (!product.isActive) {
    return res.status(400).json({ success: false, error: 'Product is currently unavailable' });
  }
  if (product.stock < quantity) {
    return res.status(400).json({
      success: false,
      error: `Only ${product.stock} units available in stock`,
    });
  }

  const userId = req.user._id.toString();
  const cart = await getCartFromRedis(userId);

  const existingIndex = cart.findIndex((i) => i.productId === productId);

  if (existingIndex > -1) {
    const newQty = cart[existingIndex].quantity + quantity;
    if (newQty > product.stock) {
      return res.status(400).json({
        success: false,
        error: `Cannot add more. Only ${product.stock} units available.`,
      });
    }
    if (newQty > 99) {
      return res.status(400).json({ success: false, error: 'Maximum 99 units per item' });
    }
    cart[existingIndex].quantity = newQty;
  } else {
    cart.push({
      productId,
      quantity,
      priceAtAdd: product.price, // Track for price change detection
    });
  }

  await saveCartToRedis(userId, cart);

  res.status(200).json({
    success: true,
    message: 'Item added to cart',
    data: {
      productId,
      productName: product.name,
      quantity: existingIndex > -1 ? cart[existingIndex].quantity : quantity,
      cartItemCount: cart.length,
    },
  });
});

// ────────────────────────────────────────────────────────────────────
// @desc   Update item quantity in cart
// @route  PUT /api/cart/update/:productId
// @access Private
// ────────────────────────────────────────────────────────────────────
exports.updateCartItem = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { quantity } = req.body;

  if (!quantity || quantity < 1 || quantity > 99) {
    return res.status(400).json({ success: false, error: 'Quantity must be between 1 and 99' });
  }

  // Verify stock
  const product = await Product.findById(productId).select('stock name').lean();
  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }
  if (product.stock < quantity) {
    return res.status(400).json({
      success: false,
      error: `Only ${product.stock} units of "${product.name}" available`,
    });
  }

  const userId = req.user._id.toString();
  const cart = await getCartFromRedis(userId);
  const index = cart.findIndex((i) => i.productId === productId);

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Item not found in cart' });
  }

  cart[index].quantity = quantity;
  await saveCartToRedis(userId, cart);

  res.status(200).json({ success: true, message: 'Cart updated', data: { productId, quantity } });
});

// ────────────────────────────────────────────────────────────────────
// @desc   Remove item from cart
// @route  DELETE /api/cart/remove/:productId
// @access Private
// ────────────────────────────────────────────────────────────────────
exports.removeFromCart = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const userId = req.user._id.toString();
  const cart = await getCartFromRedis(userId);

  const filtered = cart.filter((i) => i.productId !== productId);

  if (filtered.length === cart.length) {
    return res.status(404).json({ success: false, error: 'Item not found in cart' });
  }

  await saveCartToRedis(userId, filtered);
  res.status(200).json({ success: true, message: 'Item removed from cart', data: { cartItemCount: filtered.length } });
});

// ────────────────────────────────────────────────────────────────────
// @desc   Clear entire cart
// @route  DELETE /api/cart/clear
// @access Private
// ────────────────────────────────────────────────────────────────────
exports.clearCart = asyncHandler(async (req, res) => {
  const redis = getRedisClient();
  await redis.del(REDIS_KEYS.cart(req.user._id.toString()));
  res.status(200).json({ success: true, message: 'Cart cleared successfully' });
});

// ────────────────────────────────────────────────────────────────────
// @desc   Get cart item count only (for navbar badge, lightweight)
// @route  GET /api/cart/count
// @access Private
// ────────────────────────────────────────────────────────────────────
exports.getCartCount = asyncHandler(async (req, res) => {
  const cart = await getCartFromRedis(req.user._id.toString());
  const count = cart.reduce((sum, i) => sum + i.quantity, 0);
  res.status(200).json({ success: true, data: { count } });
});
