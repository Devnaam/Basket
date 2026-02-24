const mongoose = require('mongoose');

const riderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    vehicleNumber: {
      type: String,
      required: [true, 'Vehicle number is required'],
      uppercase: true,
      trim: true,
    },
    vehicleType: {
      type: String,
      enum: ['bike', 'scooter', 'bicycle'],
      required: true,
    },
    idProof: { type: String, required: true },  // Cloudinary URL
    photo: { type: String, required: true },     // Cloudinary URL
    currentLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },
    status: {
      type: String,
      enum: ['available', 'busy', 'offline'],
      default: 'offline',
    },
    currentOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    darkStore: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DarkStore',
      required: true,
    },
    earnings: {
      today: { type: Number, default: 0 },
      thisWeek: { type: Number, default: 0 },
      thisMonth: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    rating: { type: Number, default: 5.0, min: 1, max: 5 },
    totalRatings: { type: Number, default: 0 },
    totalDeliveries: { type: Number, default: 0 },
    onTimeDeliveries: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ───────────────────────────────────────────────────────────
riderSchema.index({ currentLocation: '2dsphere' });
riderSchema.index({ status: 1, darkStore: 1 });

// ── Virtuals ──────────────────────────────────────────────────────────
riderSchema.virtual('onTimePercentage').get(function () {
  if (this.totalDeliveries === 0) return 0;
  return Math.round((this.onTimeDeliveries / this.totalDeliveries) * 100);
});

// ── Methods ───────────────────────────────────────────────────────────
riderSchema.methods.updateRating = async function (newRating) {
  const totalScore = this.rating * this.totalRatings + newRating;
  this.totalRatings += 1;
  this.rating = parseFloat((totalScore / this.totalRatings).toFixed(1));
  await this.save();
};

module.exports = mongoose.model('Rider', riderSchema);
