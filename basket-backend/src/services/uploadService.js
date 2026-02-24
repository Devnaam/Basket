const { cloudinary } = require('../config/cloudinary');
const { Readable } = require('stream');
const logger = require('../utils/logger');

/**
 * Upload buffer to Cloudinary (compatible with multer v2 memory storage)
 * @param {Buffer} buffer - File buffer from multer
 * @param {Object} options - Cloudinary upload options
 * @returns {Object} Cloudinary upload result
 */
const uploadBuffer = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || 'basket',
        transformation: options.transformation || [
          { width: 800, height: 800, crop: 'limit' },
          { quality: 'auto' },
          { fetch_format: 'auto' }, // WebP where supported
        ],
        ...options,
      },
      (error, result) => {
        if (error) {
          logger.error(`Cloudinary upload failed: ${error.message}`);
          reject(new Error('Image upload failed. Please try again.'));
        } else {
          resolve(result);
        }
      }
    );

    // Convert buffer to readable stream and pipe to Cloudinary
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
};

/**
 * Upload product image
 */
const uploadProductImage = (buffer, productName) => {
  return uploadBuffer(buffer, {
    folder: 'basket/products',
    public_id: `product_${Date.now()}`,
    transformation: [
      { width: 800, height: 800, crop: 'limit' },
      { quality: 'auto:good' },
      { fetch_format: 'auto' },
    ],
    tags: ['product', productName],
  });
};

/**
 * Upload rider ID proof / photo
 */
const uploadRiderDocument = (buffer, type = 'id_proof') => {
  return uploadBuffer(buffer, {
    folder: `basket/riders/${type}`,
    public_id: `${type}_${Date.now()}`,
    transformation: [
      { width: 1200, height: 900, crop: 'limit' },
      { quality: 'auto' },
    ],
  });
};

/**
 * Upload banner image (full width)
 */
const uploadBanner = (buffer) => {
  return uploadBuffer(buffer, {
    folder: 'basket/banners',
    public_id: `banner_${Date.now()}`,
    transformation: [
      { width: 1200, height: 400, crop: 'fill', gravity: 'center' },
      { quality: 'auto:best' },
      { fetch_format: 'auto' },
    ],
  });
};

/**
 * Delete image from Cloudinary by public_id
 */
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    logger.error(`Cloudinary delete failed for ${publicId}: ${error.message}`);
    throw new Error('Failed to delete image');
  }
};

module.exports = {
  uploadBuffer,
  uploadProductImage,
  uploadRiderDocument,
  uploadBanner,
  deleteImage,
};
