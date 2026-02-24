const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Coupon code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [20, 'Coupon code cannot exceed 20 characters'],
    },
    discountType: {
      type: String,
      enum: ['percentage', 'flat'],
      required: true,
    },
    discountValue: {
      type: Number,
      required: [true, 'Discount value is required'],
      min: [0, 'Discount value cannot be negative'],
    },
    minOrderValue: { type: Number, default: 0, min: 0 },
    maxDiscount: Number, // Cap for percentage discounts (e.g. max ₹100 off)
    validFrom: { type: Date, required: [true, 'Valid from date is required'] },
    validUntil: { type: Date, required: [true, 'Valid until date is required'] },
    usageLimit: { type: Number, default: null }, // null = unlimited
    usedCount: { type: Number, default: 0 },
    userUsageLimit: { type: Number, default: 1 }, // Per-user usage cap
    usedBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        usedAt: { type: Date, default: Date.now },
        orderId: String,
      },
    ],
    isActive: { type: Boolean, default: true },
    description: String, // Admin-facing description
    applicableCategories: [String], // [] = all categories
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────
couponSchema.index({ code: 1, isActive: 1 });
couponSchema.index({ validUntil: 1 });

// ── Method: Validate coupon ───────────────────────────────────────────
couponSchema.methods.isValid = function (orderAmount, userId) {
  const now = new Date();
  if (!this.isActive)
    return { valid: false, message: 'This coupon is no longer active' };
  if (now < this.validFrom)
    return { valid: false, message: 'This coupon is not yet valid' };
  if (now > this.validUntil)
    return { valid: false, message: 'This coupon has expired' };
  if (this.usageLimit !== null && this.usedCount >= this.usageLimit)
    return { valid: false, message: 'Coupon usage limit has been reached' };
  if (orderAmount < this.minOrderValue)
    return { valid: false, message: `Minimum order value is ₹${this.minOrderValue}` };
  if (userId) {
    const timesUsed = this.usedBy.filter(
      (entry) => entry.user.toString() === userId.toString()
    ).length;
    if (timesUsed >= this.userUsageLimit)
      return { valid: false, message: 'You have already used this coupon' };
  }
  return { valid: true };
};

// ── Method: Calculate discount amount ────────────────────────────────
couponSchema.methods.calculateDiscount = function (orderAmount) {
  let discount =
    this.discountType === 'flat'
      ? this.discountValue
      : (orderAmount * this.discountValue) / 100;

  if (this.maxDiscount) discount = Math.min(discount, this.maxDiscount);
  return Math.min(discount, orderAmount); // Can't exceed order total
};

module.exports = mongoose.model('Coupon', couponSchema);
