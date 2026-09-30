const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authenticateToken } = require('../middleware/authMiddleware');

// All AI endpoints require an authenticated session
router.use(authenticateToken);

// AI Trigger & Feedback Analysis
router.post('/analyze-feedback/:feedbackId', aiController.triggerFeedbackAnalysis);
router.get('/feedback/:feedbackId', aiController.getFeedbackAnalysis);

// Root-Cause & Issue Intelligence
router.get('/issues/:issueId', aiController.getIssueIntelligence);
router.get('/root-causes/:issueId', aiController.getRootCauses);
router.get('/explain/:issueId', aiController.getExplainability);

module.exports = router;
