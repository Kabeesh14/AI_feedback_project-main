const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authenticateToken } = require('../middleware/authMiddleware');
const firebaseStorageService = require('../services/firebaseStorageService');
const { pool } = require('../config/db');

// Multer memory storage (keeps binary in memory for direct cloud upload)
const storage = multer.memoryStorage();

// Strict image MIME filter: JPEG, PNG, WEBP only (rejects SVG, PDF, EXE, GIF)
const fileFilter = (req, file, cb) => {
  const allowedMime = firebaseStorageService.ALLOWED_MIME_TYPES;
  const ext = path.extname(file.originalname || '').toLowerCase();

  if (!allowedMime.includes(file.mimetype) || !firebaseStorageService.ALLOWED_EXTENSIONS.includes(ext)) {
    const error = new Error(`Invalid file type "${file.mimetype}". Allowed types: JPEG, PNG, and WEBP only.`);
    error.statusCode = 400;
    return cb(error, false);
  }
  cb(null, true);
};

// 500 KB maximum file size limit (5 KB to 500 KB allowed)
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: firebaseStorageService.MAX_IMAGE_SIZE_BYTES // 500 KB
  }
});

/**
 * POST /api/upload
 * Upload an image for feedback evidence using portal-aware Firebase Storage
 * Portal is determined strictly from the authenticated backend user context
 */
router.post('/', authenticateToken, (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File size exceeds maximum allowed limit of 500 KB.'
        });
      }
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Failed to upload image.'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file uploaded. Please provide an image file under the "image" field.'
      });
    }

    if (req.file.size < firebaseStorageService.MIN_IMAGE_SIZE_BYTES) {
      const sizeKb = (req.file.size / 1024).toFixed(1);
      return res.status(400).json({
        success: false,
        message: `File size (${sizeKb} KB) is below the minimum allowed limit of 5 KB.`
      });
    }

    try {
      // Portal is strictly resolved from authenticated backend context (Section 8)
      const user = req.user || {};
      const authenticatedPortal = (user.portal || 'education').toLowerCase();
      const feedbackId = req.body.feedbackId || 'pending';

      const uploadResult = await firebaseStorageService.uploadFeedbackImage({
        buffer: req.file.buffer,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        portal: authenticatedPortal,
        feedbackId,
        userId: user.id
      });

      return res.status(201).json({
        success: true,
        message: 'Image uploaded successfully.',
        data: {
          url: uploadResult.url,
          storagePath: uploadResult.storagePath,
          filename: uploadResult.filename,
          originalName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
          portal: uploadResult.portal,
          provider: uploadResult.provider
        }
      });
    } catch (uploadError) {
      console.error('[Upload Service Error]:', uploadError);
      const statusCode = uploadError.statusCode || 500;
      return res.status(statusCode).json({
        success: false,
        message: uploadError.message || 'Error uploading image to storage.'
      });
    }
  });
});

/**
 * GET /api/upload/feedback/:id/image
 * Secure image retrieval route verifying caller authorization (Section 9 & 10)
 */
router.get('/feedback/:id/image', authenticateToken, async (req, res) => {
  try {
    const feedbackId = parseInt(req.params.id, 10);
    if (isNaN(feedbackId)) {
      return res.status(400).json({ success: false, message: 'Invalid feedback ID.' });
    }

    const [rows] = await pool.query('SELECT * FROM feedback WHERE id = ?', [feedbackId]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Feedback record not found.' });
    }

    const feedbackRecord = rows[0];
    if (!feedbackRecord.image_url) {
      return res.status(404).json({ success: false, message: 'No image attached to this feedback.' });
    }

    // Verify caller authorization
    const accessCheck = firebaseStorageService.verifyImageAccess(feedbackRecord, req.user);
    if (!accessCheck.authorized) {
      return res.status(403).json({
        success: false,
        message: accessCheck.reason || 'Forbidden: You are not authorized to view this image.'
      });
    }

    // If already a full URL (Firebase signed URL or web URL)
    if (feedbackRecord.image_url.startsWith('http://') || feedbackRecord.image_url.startsWith('https://')) {
      if (req.query.redirect === 'true') {
        return res.redirect(feedbackRecord.image_url);
      }
      return res.status(200).json({
        success: true,
        data: { url: feedbackRecord.image_url }
      });
    }

    // If local path or storage path
    const localUrl = feedbackRecord.image_url.startsWith('/')
      ? feedbackRecord.image_url
      : `/uploads/${feedbackRecord.image_url}`;

    if (req.query.redirect === 'true') {
      return res.redirect(localUrl);
    }

    return res.status(200).json({
      success: true,
      data: { url: localUrl }
    });
  } catch (err) {
    console.error('[Image Access Error]:', err);
    return res.status(500).json({ success: false, message: 'Internal server error retrieving image.' });
  }
});

module.exports = router;

