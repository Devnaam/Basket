/**
 * Basket — Database Seed Script
 * Run: node src/scripts/seed.js
 *
 * Seeds: Admin user, Dark Store, Categories, Products
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const mongoose  = require('mongoose');
const bcrypt    = require('bcryptjs');

// ── Import Models ─────────────────────────────────────────────────────
const User      = require('../models/User');
const DarkStore = require('../models/DarkStore');
const Category  = require('../models/Category');
const Product   = require('../models/Product');

// ── Hyderabad Coordinates (Banjara Hills) ─────────────────────────────
const DARK_STORE_COORDS = [78.4483, 17.4126]; // [lng, lat]

// ─────────────────────────────────────────────────────────────────────
// SEED DATA
// ─────────────────────────────────────────────────────────────────────

const ADMIN_PHONE = '9000000000'; // ← Change this to your phone number

const CATEGORIES = [
  { name: 'Fruits & Vegetables', emoji: '🥦', sortOrder: 1 },
  { name: 'Dairy & Eggs',        emoji: '🥛', sortOrder: 2 },
  { name: 'Snacks & Munchies',   emoji: '🍟', sortOrder: 3 },
  { name: 'Beverages',           emoji: '🥤', sortOrder: 4 },
  { name: 'Staples & Grains',    emoji: '🌾', sortOrder: 5 },
  { name: 'Personal Care',       emoji: '🧴', sortOrder: 6 },
  { name: 'Household',           emoji: '🧹', sortOrder: 7 },
  { name: 'Bakery & Breads',     emoji: '🍞', sortOrder: 8 },
];

// Products are added after categories + darkStore are created
const getProducts = (categoryMap, darkStoreId) => [

  // ── Fruits & Vegetables ──────────────────────────────────────────
  {
    name:        'Fresh Tomatoes',
    description: 'Farm fresh red tomatoes. Perfect for curries and salads.',
    price:       25,  mrp: 30,
    unit:        '500g',
    category:    categoryMap['Fruits & Vegetables'],
    darkStore:   darkStoreId,
    stock:       200,
    images:      [{ url: 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=400', isDefault: true }],
  },
  {
    name:        'Bananas',
    description: 'Fresh yellow bananas, rich in potassium.',
    price:       35,  mrp: 40,
    unit:        '6 pcs',
    category:    categoryMap['Fruits & Vegetables'],
    darkStore:   darkStoreId,
    stock:       150,
    images:      [{ url: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400', isDefault: true }],
  },
  {
    name:        'Onions',
    description: 'Fresh onions from local farms.',
    price:       30,  mrp: 35,
    unit:        '1 kg',
    category:    categoryMap['Fruits & Vegetables'],
    darkStore:   darkStoreId,
    stock:       300,
    images:      [{ url: 'https://images.unsplash.com/photo-1518977956812-cd3dbadaaf31?w=400', isDefault: true }],
  },
  {
    name:        'Potatoes',
    description: 'Fresh potatoes, great for all Indian dishes.',
    price:       28,  mrp: 32,
    unit:        '1 kg',
    category:    categoryMap['Fruits & Vegetables'],
    darkStore:   darkStoreId,
    stock:       300,
    images:      [{ url: 'https://images.unsplash.com/photo-1518977822534-7049a61ee0c2?w=400', isDefault: true }],
  },

  // ── Dairy & Eggs ─────────────────────────────────────────────────
  {
    name:        'Amul Butter',
    description: 'Amul pasteurised butter, 500g pack.',
    price:       265, mrp: 280,
    unit:        '500g',
    category:    categoryMap['Dairy & Eggs'],
    darkStore:   darkStoreId,
    stock:       80,
    images:      [{ url: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400', isDefault: true }],
  },
  {
    name:        'Farm Fresh Eggs',
    description: 'Free-range white eggs, pack of 12.',
    price:       78,  mrp: 84,
    unit:        '12 pcs',
    category:    categoryMap['Dairy & Eggs'],
    darkStore:   darkStoreId,
    stock:       120,
    images:      [{ url: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400', isDefault: true }],
  },
  {
    name:        'Amul Taza Milk',
    description: 'Full cream toned milk, 1 litre pouch.',
    price:       62,  mrp: 65,
    unit:        '1 L',
    category:    categoryMap['Dairy & Eggs'],
    darkStore:   darkStoreId,
    stock:       100,
    images:      [{ url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400', isDefault: true }],
  },

  // ── Snacks & Munchies ────────────────────────────────────────────
  {
    name:        'Lays Classic Salted',
    description: 'Crispy potato chips, classic salted flavour.',
    price:       20,  mrp: 20,
    unit:        '52g',
    category:    categoryMap['Snacks & Munchies'],
    darkStore:   darkStoreId,
    stock:       200,
    images:      [{ url: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400', isDefault: true }],
  },
  {
    name:        'Maggi Noodles',
    description: '2-minute noodles, masala flavour. Pack of 4.',
    price:       56,  mrp: 60,
    unit:        '4 × 70g',
    category:    categoryMap['Snacks & Munchies'],
    darkStore:   darkStoreId,
    stock:       150,
    images:      [{ url: 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=400', isDefault: true }],
  },
  {
    name:        'Hide & Seek Biscuits',
    description: 'Parle chocolate chip cookies.',
    price:       30,  mrp: 35,
    unit:        '120g',
    category:    categoryMap['Snacks & Munchies'],
    darkStore:   darkStoreId,
    stock:       180,
    images:      [{ url: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400', isDefault: true }],
  },

  // ── Beverages ────────────────────────────────────────────────────
  {
    name:        'Coca-Cola',
    description: 'Classic Coca-Cola can, chilled and refreshing.',
    price:       40,  mrp: 45,
    unit:        '330ml',
    category:    categoryMap['Beverages'],
    darkStore:   darkStoreId,
    stock:       200,
    images:      [{ url: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400', isDefault: true }],
  },
  {
    name:        'Tropicana Orange Juice',
    description: '100% pure orange juice with no added sugar.',
    price:       90,  mrp: 99,
    unit:        '1 L',
    category:    categoryMap['Beverages'],
    darkStore:   darkStoreId,
    stock:       80,
    images:      [{ url: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400', isDefault: true }],
  },

  // ── Staples & Grains ─────────────────────────────────────────────
  {
    name:        'Tata Salt',
    description: 'Vacuum evaporated iodised salt.',
    price:       20,  mrp: 22,
    unit:        '1 kg',
    category:    categoryMap['Staples & Grains'],
    darkStore:   darkStoreId,
    stock:       300,
    images:      [{ url: 'https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?w=400', isDefault: true }],
  },
  {
    name:        'Fortune Basmati Rice',
    description: 'Long grain aged basmati rice for perfect biryani.',
    price:       145, mrp: 160,
    unit:        '1 kg',
    category:    categoryMap['Staples & Grains'],
    darkStore:   darkStoreId,
    stock:       200,
    images:      [{ url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400', isDefault: true }],
  },
  {
    name:        'Aashirvaad Atta',
    description: 'Whole wheat atta for soft rotis.',
    price:       280, mrp: 310,
    unit:        '5 kg',
    category:    categoryMap['Staples & Grains'],
    darkStore:   darkStoreId,
    stock:       100,
    images:      [{ url: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400', isDefault: true }],
  },

  // ── Personal Care ────────────────────────────────────────────────
  {
    name:        'Dove Soap',
    description: 'Moisturising cream beauty bar, pack of 3.',
    price:       120, mrp: 135,
    unit:        '3 × 75g',
    category:    categoryMap['Personal Care'],
    darkStore:   darkStoreId,
    stock:       100,
    images:      [{ url: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400', isDefault: true }],
  },

  // ── Household ────────────────────────────────────────────────────
  {
    name:        'Vim Dishwash Bar',
    description: 'Powerful dishwash bar with lemon extracts.',
    price:       35,  mrp: 40,
    unit:        '200g',
    category:    categoryMap['Household'],
    darkStore:   darkStoreId,
    stock:       200,
    images:      [{ url: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400', isDefault: true }],
  },

  // ── Bakery & Breads ──────────────────────────────────────────────
  {
    name:        'Modern Bread',
    description: 'Soft sandwich bread, sliced.',
    price:       45,  mrp: 50,
    unit:        '400g',
    category:    categoryMap['Bakery & Breads'],
    darkStore:   darkStoreId,
    stock:       60,
    images:      [{ url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400', isDefault: true }],
  },
];

// ─────────────────────────────────────────────────────────────────────
// MAIN SEED FUNCTION
// ─────────────────────────────────────────────────────────────────────
const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('\n✅ MongoDB connected\n');

    // ── 1. Admin User ──────────────────────────────────────────────
    console.log('👤 Seeding admin user...');
    let admin = await User.findOne({ phone: ADMIN_PHONE });
    if (!admin) {
      admin = await User.create({
        phone:     ADMIN_PHONE,
        name:      'Basket Admin',
        role:      'admin',
        isActive:  true,
      });
      console.log(`   ✅ Admin created: ${ADMIN_PHONE}`);
    } else {
      // Ensure existing user is admin
      admin.role = 'admin';
      admin.name = admin.name || 'Basket Admin';
      await admin.save();
      console.log(`   ♻️  Admin already exists, role ensured: ${ADMIN_PHONE}`);
    }

    // ── 2. Dark Store ──────────────────────────────────────────────
    console.log('\n🏪 Seeding dark store...');
    let darkStore = await DarkStore.findOne({ name: 'Basket Hyderabad Central' });
    if (!darkStore) {
      darkStore = await DarkStore.create({
        name:     'Basket Hyderabad Central',
        address:  'Banjara Hills Road No. 12, Hyderabad, Telangana 500034',
        phone:    '9000000001',
        location: {
          type:        'Point',
          coordinates: DARK_STORE_COORDS,
        },
        isActive:         true,
        operatingHours:   { open: '06:00', close: '23:00' },
        deliveryRadius:   5,
        avgDeliveryTime:  20,
      });
      console.log(`   ✅ Dark store created: ${darkStore.name}`);
    } else {
      console.log(`   ♻️  Dark store already exists: ${darkStore.name}`);
    }

    // ── 3. Categories ──────────────────────────────────────────────
    console.log('\n📂 Seeding categories...');
    const categoryMap = {};

    for (const cat of CATEGORIES) {
      let existing = await Category.findOne({ name: cat.name });
      if (!existing) {
        existing = await Category.create({ ...cat, isActive: true });
        console.log(`   ✅ Created: ${cat.emoji} ${cat.name}`);
      } else {
        console.log(`   ♻️  Exists:  ${cat.emoji} ${cat.name}`);
      }
      categoryMap[cat.name] = existing._id;
    }

    // ── 4. Products ────────────────────────────────────────────────
    console.log('\n📦 Seeding products...');
    const products = getProducts(categoryMap, darkStore._id);
    let created = 0;
    let skipped = 0;

    for (const product of products) {
      const exists = await Product.findOne({ name: product.name, darkStore: darkStore._id });
      if (!exists) {
        await Product.create({ ...product, isActive: true, lowStockThreshold: 10 });
        console.log(`   ✅ Created: ${product.name}`);
        created++;
      } else {
        skipped++;
      }
    }

    if (skipped > 0) console.log(`   ♻️  Skipped ${skipped} already existing products`);

    // ── Summary ────────────────────────────────────────────────────
    console.log('\n' + '═'.repeat(50));
    console.log('🎉  SEED COMPLETE!');
    console.log('═'.repeat(50));
    console.log(`👤  Admin phone    : ${ADMIN_PHONE}`);
    console.log(`🏪  Dark store     : ${darkStore.name}`);
    console.log(`📍  Coordinates    : ${DARK_STORE_COORDS[1]}, ${DARK_STORE_COORDS[0]}`);
    console.log(`📂  Categories     : ${CATEGORIES.length}`);
    console.log(`📦  Products added : ${created}`);
    console.log('═'.repeat(50));
    console.log('\n✅ Login as admin with phone: ' + ADMIN_PHONE);
    console.log('✅ Open http://localhost:5173/login to test customer\n');

    await mongoose.disconnect();
    process.exit(0);

  } catch (err) {
    console.error('\n❌ Seed failed:', err.message);
    console.error(err);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seed();
