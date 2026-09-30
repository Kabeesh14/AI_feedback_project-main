const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticateToken } = require('../middleware/authMiddleware');

// All analytics routes require authentication
router.use(authenticateToken);

// 1. Dashboard Metrics
router.get('/dashboard', analyticsController.getDashboard);

// 2. Deterministic Pulse Score
router.get('/pulse', analyticsController.getPulse);

// 3. What Changed Today Summary
router.get('/summary', analyticsController.getSummary);

// 4. Themes & Categories Breakdown
router.get('/themes', analyticsController.getThemes);

// 5. Issues Tracking
router.get('/issues', analyticsController.getIssues);

// 6. Root Causes & Evidence
router.get('/root-causes', analyticsController.getRootCauses);

// 7. Time-Series Trends
router.get('/trends', analyticsController.getTrends);

// 8. Department Comparison (Management only)
router.get('/department-comparison', analyticsController.getDepartmentComparison);

module.exports = router;
