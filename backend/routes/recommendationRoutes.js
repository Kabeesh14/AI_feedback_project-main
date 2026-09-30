const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendationController');
const { authenticateToken } = require('../middleware/authMiddleware');

// All recommendation operations require authentication
router.use(authenticateToken);

// 1. Create recommendation (HOD only, scoped to own department issue)
router.post('/', recommendationController.createRecommendation);

// 2. List recommendations (HOD scoped to own department, Management institution-wide)
router.get('/', recommendationController.getRecommendations);

// 3. Get single recommendation with audit trail updates
router.get('/:id', recommendationController.getRecommendationById);

// 4. Management review decision (approved, rejected, deferred)
router.put('/:id/review', recommendationController.reviewRecommendation);

// 5. Convert approved recommendation to institution action
router.post('/:id/create-action', recommendationController.convertToAction);

module.exports = router;
