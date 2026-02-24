require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Rider = require('../models/Rider');
const DarkStore = require('../models/DarkStore');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const logger = require('../utils/logger');

// ── Seed Data ─────────────────────────────────────────────────────────

const darkStoresData = [
  {
    name: 'Basket Dark Store — Knowledge Park II',
    address: 'Shop No. 12, Alpha Commercial Belt, Knowledge Park II, Greater Noida, UP 201306',
    location: { type: 'Point', coordinates: [77.4538, 28.4744] },
    coverageRadius: 3000,
    isOperational: true,
    operatingHours: { open: '00:00', close: '23:59' },
    contactPhone: '9999000001',
    managerName: 'Rahul Sharma',
  },
  {
    name: 'Basket Dark Store — Pari Chowk',
    address: 'Plot 5B, Pari Chowk Market, Greater Noida, UP 201310',
    location: { type: 'Point', coordinates: [77.5038, 28.4719] },
    coverageRadius: 3000,
    isOperational: true,
    operatingHours: { open: '00:00', close: '23:59' },
    contactPhone: '9999000002',
    managerName: 'Priya Singh',
  },
];

const getProductsData = (storeId1, storeId2) => [
  // ── Vegetables ──────────────────────────────────────────────────
  { name: 'Fresh Tomatoes', category: 'Vegetables', subcategory: 'Salad Vegetables', brand: 'Farm Fresh', price: 40, mrp: 55, unit: 'kg', quantity: 1, images: ['https://res.cloudinary.com/demo/image/upload/v1/samples/food/tomatoes.jpg'], description: 'Fresh, ripe red tomatoes sourced daily', stock: 100, lowStockThreshold: 15, darkStore: storeId1, tags: ['fresh', 'organic'] },
  { name: 'Onions', category: 'Vegetables', subcategory: 'Root Vegetables', brand: 'Farm Fresh', price: 30, mrp: 40, unit: 'kg', quantity: 1, images: ['https://res.cloudinary.com/demo/image/upload/v1/samples/food/onions.jpg'], description: 'Fresh Indian onions', stock: 150, darkStore: storeId1, tags: ['fresh'] },
  { name: 'Potatoes', category: 'Vegetables', subcategory: 'Root Vegetables', brand: 'Farm Fresh', price: 25, mrp: 35, unit: 'kg', quantity: 1, images: ['https://res.cloudinary.com/demo/image/upload/v1/samples/food/potatoes.jpg'], description: 'Premium quality potatoes', stock: 200, darkStore: storeId1, tags: ['fresh'] },
  { name: 'Spinach', category: 'Vegetables', subcategory: 'Leafy Greens', brand: 'Green Valley', price: 20, mrp: 30, unit: 'pack', quantity: 200, images: ['https://res.cloudinary.com/demo/image/upload/v1/samples/food/spinach.jpg'], description: 'Fresh spinach leaves — 200g pack', stock: 60, darkStore: storeId2, tags: ['fresh', 'organic'] },
  // ── Fruits ──────────────────────────────────────────────────────
  { name: 'Bananas', category: 'Fruits', subcategory: 'Tropical Fruits', brand: 'Farm Fresh', price: 45, mrp: 60, unit: 'dozen', quantity: 12, images: ['https://res.cloudinary.com/demo/image/upload/v1/samples/food/bananas.jpg'], description: 'Fresh yellow bananas — 1 dozen', stock: 80, darkStore: storeId1, tags: ['fresh'] },
  { name: 'Apples — Shimla', category: 'Fruits', subcategory: 'Seasonal Fruits', brand: 'Himalayan Harvest', price: 150, mrp: 200, unit: 'kg', quantity: 1, images: ['https://res.cloudinary.com/demo/image/upload/v1/samples/food/apples.jpg'], description: 'Premium Shimla apples, crisp and sweet', stock: 50, darkStore: storeId2, tags: ['premium', 'seasonal'] },
  // ── Dairy ───────────────────────────────────────────────────────
  { name: 'Amul Milk — Full Cream', category: 'Dairy', subcategory: 'Milk', brand: 'Amul', price: 31, mrp: 31, unit: 'ltr', quantity: 500, images: ['https://res.cloudinary.com/demo/image/upload/v1/samples/food/milk.jpg'], description: 'Amul full cream milk 500ml', stock: 200, darkStore: storeId1 },
  { name: 'Amul Butter', category: 'Dairy', subcategory: 'Butter & Cheese', brand: 'Amul', price: 55, mrp: 60, unit: 'g', quantity: 100, images: ['https://res.cloudinary.com/demo/image/upload/v1/samples/food/butter.jpg'], description: 'Amul pasteurized butter 100g', stock: 120, darkStore: storeId1 },
  { name: 'Mother Dairy Curd', category: 'Dairy', subcategory: 'Curd & Yogurt', brand: 'Mother Dairy', price: 45, mrp: 50, unit: 'g', quantity: 400, images: ['https://res.cloudinary.com/demo/image/upload/v1/samples/food/curd.jpg'], description: 'Fresh dahi 400g cup', stock: 90, darkStore: storeId2 },
  { name: 'Amul Cheese Slices', category: 'Dairy', subcategory: 'Butter & Cheese', brand: 'Amul', price: 110, mrp: 125, unit: 'pack', quantity: 200, images: ['https://res.cloudinary.com/demo/image/upload/v1/samples/food/cheese.jpg'], description: 'Amul processed cheese slices 200g', stock: 65, darkStore: storeId1 },
  // ── Groceries ───────────────────────────────────────────────────
  { name: 'Aashirvaad Atta — Whole Wheat', category: 'Groceries', subcategory: 'Flour & Grains', brand: 'Aashirvaad', price: 280, mrp: 320, unit: 'kg', quantity: 5, images: ['https://res.cloudinary.com/demo/image/upload/v1/samples/food/atta.jpg'], description: 'Premium whole wheat atta 5kg', stock: 80, darkStore: storeId1 },
  { name: 'India Gate Basmati Rice', category: 'Groceries', subcategory: 'Rice & Pulses', brand: 'India Gate', price: 350, mrp: 400, unit: 'kg', quantity: 5, images: ['https://res.cloudinary.com/demo/image/upload/v1/samples/food/rice.jpg'], description: 'Classic basmati rice 5kg', stock: 60, darkStore: storeId1 },
  { name: 'Tata Salt', category: 'Groceries', subcategory: 'Spices & Salt', brand: 'Tata', price: 25, mrp: 28, unit: 'kg', quantity: 1, images: ['https://res.cloudinary.com/demo/image/upload/v1/samples/food/salt.jpg'], description: 'Iodized table salt 1kg', stock: 300, darkStore: storeId2 },
  { name: 'Fortune Refined Oil', category: 'Groceries', subcategory: 'Oils & Ghee', brand: 'Fortune', price: 145, mrp: 165, unit: 'ltr', quantity: 1, images: ['https://res.cloudinary.com/demo/image/upload/v1/samples/food/oil.jpg'], description: 'Fortune refined sunflower oil 1L', stock: 90, darkStore: storeId1 },
  // ── Snacks ──────────────────────────────────────────────────────
  { name: "Lays Classic Salted", category: 'Snacks', subcategory: 'Chips', brand: "Lay's", price: 20, mrp: 20, unit: 'g', quantity: 52, images: ['https://res.cloudinary.com/demo/image/upload/v1/samples/food/chips.jpg'], description: "Lay's classic salted chips 52g", stock: 200, darkStore: storeId1 },
  { name: 'Maggi 2-Minute Noodles', category: 'Snacks', subcategory: 'Instant Noodles', brand: 'Maggi', price: 14, mrp: 14, unit: 'g', quantity: 70, images: ['https://res.cloudinary.com/demo/image/upload/v1/samples/food/maggi.jpg'], description: 'Masala flavour instant noodles 70g', stock: 400, darkStore: storeId1, tags: ['bestseller'] },
  { name: 'Britannia Good Day Cookies', category: 'Snacks', subcategory: 'Biscuits & Cookies', brand: 'Britannia', price: 30, mrp: 35, unit: 'g', quantity: 150, images: ['https://res.cloudinary.com/demo/image/upload/v1/samples/food/cookies.jpg'], description: 'Butter cookies 150g pack', stock: 150, darkStore: storeId2 },
  // ── Beverages ───────────────────────────────────────────────────
  { name: 'Coca-Cola', category: 'Beverages', subcategory: 'Soft Drinks', brand: 'Coca-Cola', price: 40, mrp: 45, unit: 'ml', quantity: 750, images: ['https://res.cloudinary.com/demo/image/upload/v1/samples/food/coke.jpg'], description: 'Coca-Cola 750ml bottle', stock: 120, darkStore: storeId1 },
  { name: 'Red Bull Energy Drink', category: 'Beverages', subcategory: 'Energy Drinks', brand: 'Red Bull', price: 115, mrp: 130, unit: 'ml', quantity: 250, images: ['https://res.cloudinary.com/demo/image/upload/v1/samples/food/redbull.jpg'], description: 'Red Bull original 250ml can', stock: 80, darkStore: storeId2, tags: ['premium'] },
  { name: 'Tata Tea Gold', category: 'Beverages', subcategory: 'Tea & Coffee', brand: 'Tata Tea', price: 260, mrp: 290, unit: 'g', quantity: 500, images: ['https://res.cloudinary.com/demo/image/upload/v1/samples/food/tea.jpg'], description: 'Premium blend tea 500g', stock: 70, darkStore: storeId1 },
  // ── Personal Care ────────────────────────────────────────────────
  { name: 'Dove Soap Bar', category: 'Personal Care', subcategory: 'Bath & Body', brand: 'Dove', price: 55, mrp: 65, unit: 'g', quantity: 100, images: ['https://res.cloudinary.com/demo/image/upload/v1/samples/food/soap.jpg'], description: 'Dove cream beauty bathing bar 100g', stock: 200, darkStore: storeId1 },
  { name: 'Colgate Total Toothpaste', category: 'Personal Care', subcategory: 'Oral Care', brand: 'Colgate', price: 95, mrp: 110, unit: 'g', quantity: 150, images: ['https://res.cloudinary.com/demo/image/upload/v1/samples/food/toothpaste.jpg'], description: 'Colgate Total 12 — 150g', stock: 120, darkStore: storeId2 },
  { name: 'Head & Shoulders Shampoo', category: 'Personal Care', subcategory: 'Hair Care', brand: "Head & Shoulders", price: 185, mrp: 210, unit: 'ml', quantity: 340, images: ['https://res.cloudinary.com/demo/image/upload/v1/samples/food/shampoo.jpg'], description: 'Anti-dandruff shampoo 340ml', stock: 80, darkStore: storeId1 },
];

const couponData = [
  {
    code: 'WELCOME50',
    discountType: 'flat',
    discountValue: 50,
    minOrderValue: 199,
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    usageLimit: 1000,
    userUsageLimit: 1,
    description: 'First order discount — ₹50 off on ₹199+',
  },
  {
    code: 'BASKET10',
    discountType: 'percentage',
    discountValue: 10,
    minOrderValue: 299,
    maxDiscount: 100,
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    description: '10% off — max ₹100 discount on ₹299+',
  },
  {
    code: 'FREEDEL',
    discountType: 'flat',
    discountValue: 25,
    minOrderValue: 0,
    description: 'Free delivery — waive ₹25 delivery fee',
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
  },
];

// ── Seeder Runner ─────────────────────────────────────────────────────
const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('✅ Connected to MongoDB for seeding');

    if (process.argv[2] === '--destroy') {
      // Wipe all collections
      await Promise.all([
        User.deleteMany({}),
        Rider.deleteMany({}),
        DarkStore.deleteMany({}),
        Product.deleteMany({}),
        Coupon.deleteMany({}),
      ]);
      logger.info('🗑️  All collections wiped');
      process.exit(0);
    }

    // ── 1. Create Dark Stores ────────────────────────────────────────
    const existingStores = await DarkStore.countDocuments();
    let stores = [];
    if (existingStores === 0) {
      stores = await DarkStore.insertMany(darkStoresData);
      logger.info(`✅ Created ${stores.length} dark stores`);
    } else {
      stores = await DarkStore.find();
      logger.info(`ℹ️  Dark stores already exist (${stores.length})`);
    }

    const [store1, store2] = stores;

    // ── 2. Create Admin User ─────────────────────────────────────────
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (!existingAdmin) {
      await User.create({
        name: 'Basket Admin',
        phone: '9999999999',
        role: 'admin',
      });
      logger.info('✅ Admin user created → phone: 9999999999');
    } else {
      logger.info('ℹ️  Admin already exists');
    }

    // ── 3. Create Test Customer ──────────────────────────────────────
    const existingCustomer = await User.findOne({ phone: '9876543210' });
    if (!existingCustomer) {
      await User.create({ name: 'Test Customer', phone: '9876543210', role: 'customer' });
      logger.info('✅ Test customer created → phone: 9876543210');
    }

    // ── 4. Create Test Rider ─────────────────────────────────────────
    const existingRiderUser = await User.findOne({ phone: '9111111111' });
    if (!existingRiderUser) {
      const riderUser = await User.create({
        name: 'Rahul Rider',
        phone: '9111111111',
        role: 'rider',
      });
      await Rider.create({
        user: riderUser._id,
        vehicleNumber: 'UP16AB1234',
        vehicleType: 'bike',
        darkStore: store1._id,
        idProof: 'https://res.cloudinary.com/demo/image/upload/v1/samples/id-proof.jpg',
        photo: 'https://res.cloudinary.com/demo/image/upload/v1/samples/people/smiling-man.jpg',
      });
      logger.info('✅ Test rider created → phone: 9111111111');
    }

    // ── 5. Create Products ───────────────────────────────────────────
    const existingProducts = await Product.countDocuments();
    if (existingProducts === 0) {
      const products = getProductsData(store1._id, store2._id);
      await Product.insertMany(products);
      logger.info(`✅ Created ${products.length} products`);
    } else {
      logger.info(`ℹ️  Products already exist (${existingProducts})`);
    }

    // ── 6. Create Coupons ────────────────────────────────────────────
    const existingCoupons = await Coupon.countDocuments();
    if (existingCoupons === 0) {
      await Coupon.insertMany(couponData);
      logger.info(`✅ Created ${couponData.length} coupons`);
    } else {
      logger.info(`ℹ️  Coupons already exist (${existingCoupons})`);
    }

    logger.info(`
════════════════════════════════════════
  🌱 Basket Database Seeded Successfully
════════════════════════════════════════
  Dark Stores : ${stores.length}
  Admin       : phone 9999999999 (OTP login)
  Customer    : phone 9876543210 (OTP login)
  Rider       : phone 9111111111 (OTP login)
  Products    : 23
  Coupons     : ${couponData.length} (WELCOME50, BASKET10, FREEDEL)
════════════════════════════════════════
    `);

    process.exit(0);
  } catch (error) {
    logger.error(`❌ Seeding failed: ${error.message}`);
    process.exit(1);
  }
};

seedDatabase();
