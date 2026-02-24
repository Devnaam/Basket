const Joi = require('joi');

/**
 * Generic Joi validation middleware factory.
 * Usage: router.post('/route', validate(schema), controller)
 */
const validate = (schema, source = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[source], {
    abortEarly: false,  // Return ALL errors at once
    stripUnknown: true, // Remove fields not in schema
  });

  if (error) {
    const errors = error.details.map((d) => ({
      field: d.path.join('.'),
      message: d.message.replace(/"/g, "'"),
    }));
    return res.status(400).json({ success: false, error: 'Validation failed', errors });
  }

  req[source] = value;
  next();
};

// ── Joi Schemas ───────────────────────────────────────────────────────

const CATEGORIES = ['Groceries', 'Vegetables', 'Fruits', 'Dairy', 'Snacks', 'Beverages', 'Personal Care'];
const UNITS = ['kg', 'g', 'ltr', 'ml', 'pack', 'piece', 'dozen'];

const schemas = {
  // Auth
  sendOTP: Joi.object({
    phone: Joi.string()
      .pattern(/^[6-9]\d{9}$/)
      .required()
      .messages({ 'string.pattern.base': 'Provide a valid 10-digit Indian phone number' }),
  }),

  verifyOTP: Joi.object({
    phone: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
    otp: Joi.string().length(6).pattern(/^\d+$/).required(),
  }),

  // Products
  addProduct: Joi.object({
    name: Joi.string().min(2).max(200).required(),
    category: Joi.string().valid(...CATEGORIES).required(),
    subcategory: Joi.string().max(100).optional().allow(''),
    brand: Joi.string().max(100).optional().allow(''),
    price: Joi.number().min(0).required(),
    mrp: Joi.number().min(Joi.ref('price')).required()
      .messages({ 'number.min': 'MRP must be greater than or equal to price' }),
    unit: Joi.string().valid(...UNITS).required(),
    quantity: Joi.number().min(0).default(1),
    images: Joi.array().items(Joi.string().uri()).min(1).required(),
    description: Joi.string().max(1000).optional().allow(''),
    stock: Joi.number().min(0).required(),
    lowStockThreshold: Joi.number().min(0).default(10),
    darkStore: Joi.string().hex().length(24).required(),
    expiryDate: Joi.date().greater('now').optional(),
    tags: Joi.array().items(Joi.string()).optional(),
  }),

  updateProduct: Joi.object({
    name: Joi.string().min(2).max(200).optional(),
    category: Joi.string().valid(...CATEGORIES).optional(),
    subcategory: Joi.string().max(100).optional().allow(''),
    brand: Joi.string().max(100).optional().allow(''),
    price: Joi.number().min(0).optional(),
    mrp: Joi.number().min(0).optional(),
    unit: Joi.string().valid(...UNITS).optional(),
    quantity: Joi.number().min(0).optional(),
    images: Joi.array().items(Joi.string().uri()).min(1).optional(),
    description: Joi.string().max(1000).optional().allow(''),
    stock: Joi.number().min(0).optional(),
    lowStockThreshold: Joi.number().min(0).optional(),
    isActive: Joi.boolean().optional(),
    expiryDate: Joi.date().optional(),
    tags: Joi.array().items(Joi.string()).optional(),
  }),

  // Cart
  addToCart: Joi.object({
    productId: Joi.string().hex().length(24).required(),
    quantity: Joi.number().min(1).max(99).default(1),
  }),

  updateCart: Joi.object({
    quantity: Joi.number().min(1).max(99).required(),
  }),

  // Orders
  createOrder: Joi.object({
    deliveryAddress: Joi.object({
      label: Joi.string().optional(),
      addressLine: Joi.string().required(),
      landmark: Joi.string().optional().allow(''),
      location: Joi.object({
        type: Joi.string().valid('Point').required(),
        coordinates: Joi.array().items(Joi.number()).length(2).required(),
      }).required(),
      pincode: Joi.string().pattern(/^\d{6}$/).required(),
    }).required(),
    paymentMethod: Joi.string().valid('upi', 'cod').required(),
    couponCode: Joi.string().uppercase().trim().optional().allow(''),
    savedAddressId: Joi.string().hex().length(24).optional(),
  }),

  // Dark Store
  createDarkStore: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    address: Joi.string().required(),
    location: Joi.object({
      type: Joi.string().valid('Point').required(),
      coordinates: Joi.array().items(Joi.number()).length(2).required(),
    }).required(),
    coverageRadius: Joi.number().min(500).max(10000).default(3000),
    operatingHours: Joi.object({
      open: Joi.string().pattern(/^\d{2}:\d{2}$/).default('00:00'),
      close: Joi.string().pattern(/^\d{2}:\d{2}$/).default('23:59'),
    }).optional(),
    contactPhone: Joi.string().pattern(/^[6-9]\d{9}$/).optional(),
    managerName: Joi.string().optional(),
  }),

  // Coupon
  createCoupon: Joi.object({
    code: Joi.string().uppercase().trim().min(3).max(20).required(),
    discountType: Joi.string().valid('percentage', 'flat').required(),
    discountValue: Joi.number().min(1).required(),
    minOrderValue: Joi.number().min(0).default(0),
    maxDiscount: Joi.number().min(0).optional(),
    validFrom: Joi.date().required(),
    validUntil: Joi.date().greater(Joi.ref('validFrom')).required(),
    usageLimit: Joi.number().min(1).optional().allow(null),
    userUsageLimit: Joi.number().min(1).default(1),
    description: Joi.string().optional(),
    applicableCategories: Joi.array().items(Joi.string()).optional(),
  }),
};

module.exports = { validate, schemas };
