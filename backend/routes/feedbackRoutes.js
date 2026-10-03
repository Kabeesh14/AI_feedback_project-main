const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const feedbackController = require('../controllers/feedbackController');
const { authenticateToken } = require('../middleware/authMiddleware');
const firebaseStorageService = require('../services/firebaseStorageService');

// All feedback operations require an authenticated session
router.use(authenticateToken);

// Optional Multer memory upload middleware to support direct feedback+image form submissions
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: firebaseStorageService.MAX_IMAGE_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    const allowedMime = firebaseStorageService.ALLOWED_MIME_TYPES;
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!allowedMime.includes(file.mimetype) || !firebaseStorageService.ALLOWED_EXTENSIONS.includes(ext)) {
      const err = new Error(`Invalid file type "${file.mimetype}". Allowed types: JPEG, PNG, WEBP.`);
      err.statusCode = 400;
      return cb(err, false);
    }
    cb(null, true);
  }
}).single('image');

const optionalUpload = (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    memoryUpload(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ success: false, message: 'File size exceeds maximum allowed limit of 5 MB.' });
        }
        return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
      } else if (err) {
        return res.status(err.statusCode || 400).json({ success: false, message: err.message });
      }
      next();
    });
  } else {
    next();
  }
};

// Specific sub-routes (before :id to avoid route collision)
router.get('/my', feedbackController.getMyFeedback);
router.get('/department/:department', feedbackController.getDepartmentFeedback);
router.get('/other-issues', feedbackController.getOtherIssues);

// Core CRUD routes
router.post('/', optionalUpload, feedbackController.createFeedback);
router.get('/', feedbackController.getAllFeedback);
router.get('/:id', feedbackController.getFeedbackById);
router.get('/:id/image', feedbackController.getFeedbackImage);
router.put('/:id', feedbackController.updateFeedback);
router.delete('/:id', feedbackController.deleteFeedback);

module.exports = router;

