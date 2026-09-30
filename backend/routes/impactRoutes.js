const express = require('express');
const router = express.Router();
const impactController = require('../controllers/impactController');
const { authenticateToken } = require('../middleware/authMiddleware');

// All impact routes require authentication
router.use(authenticateToken);

// 1. Institution-wide overview (MUST precede /:actionId to prevent route collision)
router.get('/overview', impactController.getOverview);

// 2. Evaluate impact
router.get('/:actionId', impactController.evaluateImpact);
router.post('/:actionId/evaluate', impactController.evaluateImpact);

// 2. Pre-action baseline metrics
router.get('/:actionId/before', impactController.getBefore);

// 3. Post-action window metrics
router.get('/:actionId/after', impactController.getAfter);

module.exports = router;
