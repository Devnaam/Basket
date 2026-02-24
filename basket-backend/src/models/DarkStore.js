const mongoose = require('mongoose');

const darkStoreSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Store name is required'],
      trim: true,
      unique: true,
    },
    address: {
      type: String,
      required: [true, 'Store address is required'],
      trim: true,
    },
    location: {
      type: { type: String, enum: ['Point'], required: true, default: 'Point' },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: [true, 'Store coordinates are required'],
      },
    },
    coverageRadius: {
      type: Number,
      default: 3000, // 3km in meters
    },
    serviceArea: {
      type: { type: String, enum: ['Polygon'] },
      coordinates: { type: [[[Number]]] }, // GeoJSON Polygon
    },
    isOperational: { type: Boolean, default: true },
    operatingHours: {
      open: { type: String, default: '00:00' },
      close: { type: String, default: '23:59' },
    },
    contactPhone: String,
    managerName: String,
  },
  { timestamps: true }
);

// ── Geospatial Index (required for $near queries) ─────────────────────
darkStoreSchema.index({ location: '2dsphere' });

// ── Static: Find nearest operational dark store ───────────────────────
darkStoreSchema.statics.findNearest = async function (longitude, latitude) {
  return this.findOne({
    isOperational: true,
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [longitude, latitude] },
        $maxDistance: 5000, // Search up to 5km, but coverage is 3km
      },
    },
  });
};

// ── Static: Find all stores covering a location ───────────────────────
darkStoreSchema.statics.findCovering = async function (longitude, latitude) {
  return this.find({
    isOperational: true,
    location: {
      $nearSphere: {
        $geometry: { type: 'Point', coordinates: [longitude, latitude] },
        $maxDistance: 3000,
      },
    },
  });
};

module.exports = mongoose.model('DarkStore', darkStoreSchema);
