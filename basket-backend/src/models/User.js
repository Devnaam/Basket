const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: [true, 'Address label is required'],
      enum: {
        values: ['Home', 'Office', 'Other'],
        message: 'Label must be Home, Office, or Other',
      },
    },
    addressLine: {
      type: String,
      required: [true, 'Address line is required'],
      trim: true,
      maxlength: [200, 'Address line cannot exceed 200 characters'],
    },
    landmark: {
      type: String,
      trim: true,
      maxlength: [100, 'Landmark cannot exceed 100 characters'],
    },
    location: {
      type: { type: String, enum: ['Point'], required: true, default: 'Point' },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: [true, 'Coordinates are required'],
      },
    },
    pincode: {
      type: String,
      required: [true, 'Pincode is required'],
      match: [/^\d{6}$/, 'Please enter a valid 6-digit pincode'],
    },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian phone number'],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true, // Allows multiple null values for optional field
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    },
    role: {
      type: String,
      enum: ['customer', 'rider', 'admin'],
      default: 'customer',
    },
    addresses: {
      type: [addressSchema],
      validate: {
        validator: (v) => v.length <= 5,
        message: 'Maximum 5 saved addresses allowed',
      },
    },
    isActive: { type: Boolean, default: true },
    // Basket Plus subscription
    subscription: {
      isActive: { type: Boolean, default: false },
      plan: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
      startDate: Date,
      endDate: Date,
    },
    walletBalance: { type: Number, default: 0, min: 0 },
    referralCode: { type: String, unique: true, sparse: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    fcmToken: String, // Firebase push notification token
  },
  { timestamps: true }
);

// ── Indexes ──────────────────────────────────────────────────────────
userSchema.index({ role: 1 });
userSchema.index({ 'addresses.location': '2dsphere' });

// ── Virtuals ─────────────────────────────────────────────────────────
userSchema.virtual('fullPhone').get(function () {
  return `+91${this.phone}`;
});

// ── Instance Methods ──────────────────────────────────────────────────
userSchema.methods.toJSON = function () {
  const user = this.toObject({ virtuals: true });
  delete user.__v;
  return user;
};

userSchema.methods.isBasketPlusActive = function () {
  if (!this.subscription.isActive) return false;
  return new Date() < new Date(this.subscription.endDate);
};

module.exports = mongoose.model('User', userSchema);
