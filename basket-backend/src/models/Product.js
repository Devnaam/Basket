const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [200, 'Product name cannot exceed 200 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: ['Groceries', 'Vegetables', 'Fruits', 'Dairy', 'Snacks', 'Beverages', 'Personal Care'],
        message: '{VALUE} is not a valid category',
      },
    },
    subcategory: {
      type: String,
      trim: true,
      maxlength: [100, 'Subcategory cannot exceed 100 characters'],
    },
    brand: {
      type: String,
      trim: true,
      maxlength: [100, 'Brand name cannot exceed 100 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Selling price is required'],
      min: [0, 'Price cannot be negative'],
    },
    mrp: {
      type: Number,
      required: [true, 'MRP is required'],
      min: [0, 'MRP cannot be negative'],
    },
    unit: {
      type: String,
      required: [true, 'Unit is required'],
      enum: {
        values: ['kg', 'g', 'ltr', 'ml', 'pack', 'piece', 'dozen'],
        message: '{VALUE} is not a valid unit',
      },
    },
    quantity: { type: Number, default: 1, min: 0 }, // e.g. 500 (for 500g), 1 (for 1kg)
    images: {
      type: [String],
      validate: {
        validator: (v) => v.length > 0,
        message: 'At least one product image is required',
      },
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    nutritionalInfo: {
      calories: Number,
      protein: String,
      carbs: String,
      fat: String,
    },
    stock: {
      type: Number,
      required: [true, 'Stock quantity is required'],
      default: 0,
      min: [0, 'Stock cannot be negative'],
    },
    lowStockThreshold: {
      type: Number,
      default: 10,
      min: 0,
    },
    darkStore: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DarkStore',
      required: [true, 'Dark store assignment is required'],
    },
    isActive: { type: Boolean, default: true },
    expiryDate: Date,
    tags: [String], // ['organic', 'fresh', 'imported'] — for search filtering
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ───────────────────────────────────────────────────────────
productSchema.index({ name: 'text', description: 'text', brand: 'text' }); // Full-text search
productSchema.index({ category: 1, subcategory: 1 });
productSchema.index({ darkStore: 1, isActive: 1 });
productSchema.index({ stock: 1 });
productSchema.index({ price: 1 });
productSchema.index({ createdAt: -1 });

// ── Virtuals ──────────────────────────────────────────────────────────
productSchema.virtual('discountPercent').get(function () {
  if (!this.mrp || this.mrp === 0) return 0;
  return Math.round(((this.mrp - this.price) / this.mrp) * 100);
});

productSchema.virtual('stockStatus').get(function () {
  if (this.stock === 0) return 'Out of Stock';
  if (this.stock <= this.lowStockThreshold) return 'Low Stock';
  return 'In Stock';
});

productSchema.virtual('isLowStock').get(function () {
  return this.stock > 0 && this.stock <= this.lowStockThreshold;
});

// ── Methods ───────────────────────────────────────────────────────────
productSchema.methods.decrementStock = async function (quantity) {
  if (this.stock < quantity) {
    throw new Error(`Insufficient stock for "${this.name}". Available: ${this.stock}`);
  }
  this.stock -= quantity;
  // Auto-deactivate when out of stock
  if (this.stock === 0) this.isActive = false;
  await this.save();
};

productSchema.methods.incrementStock = async function (quantity) {
  this.stock += quantity;
  if (this.stock > 0 && !this.isActive) this.isActive = true;
  await this.save();
};

module.exports = mongoose.model('Product', productSchema);
