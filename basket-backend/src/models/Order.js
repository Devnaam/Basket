const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: { type: String, required: true }, // Snapshot at time of order
    price: { type: Number, required: true },
    mrp: Number,
    quantity: { type: Number, required: true, min: [1, 'Quantity must be at least 1'] },
    unit: String,
    image: String, // Primary image URL snapshot
  },
  { _id: true }
);

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: {
      type: [orderItemSchema],
      validate: {
        validator: (v) => v.length > 0,
        message: 'Order must contain at least one item',
      },
    },
    totalAmount: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, default: 25, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    gst: {
      cgst: { type: Number, default: 0 },
      sgst: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    grandTotal: { type: Number, required: true, min: 0 },
    deliveryAddress: {
      label: String,
      addressLine: { type: String, required: true },
      landmark: String,
      location: {
        type: { type: String, enum: ['Point'], required: true, default: 'Point' },
        coordinates: { type: [Number], required: true },
      },
      pincode: String,
    },
    status: {
      type: String,
      enum: ['placed', 'packing', 'out_for_delivery', 'delivered', 'cancelled'],
      default: 'placed',
    },
    statusHistory: [
      {
        status: String,
        timestamp: { type: Date, default: Date.now },
        note: String,
        updatedBy: String, // 'system', 'rider', 'admin'
      },
    ],
    rider: { type: mongoose.Schema.Types.ObjectId, ref: 'Rider' },
    darkStore: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DarkStore',
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ['upi', 'cod'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    couponCode: String,
    estimatedDeliveryTime: Date,
    deliveredAt: Date,
    cancellationReason: String,
    cancelledBy: { type: String, enum: ['customer', 'admin', 'system'] },
    deliveryOTP: String, // 4-digit OTP for delivery confirmation
    rating: { type: Number, min: 1, max: 5 },
    review: { type: String, maxlength: 500 },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, darkStore: 1 });
orderSchema.index({ rider: 1, status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'deliveryAddress.location': '2dsphere' });

// ── Pre-save: Generate orderId & Track Status History ─────────────────
orderSchema.pre('save', function (next) {
  // Generate unique Order ID on creation
  if (!this.orderId) {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(100000 + Math.random() * 900000);
    this.orderId = `BSK${datePart}${random}`;
  }
  // Auto-track status changes in history
  if (this.isModified('status')) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date(),
    });
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
