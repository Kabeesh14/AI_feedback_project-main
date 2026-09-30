const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken } = require('../middleware/authMiddleware');

// All report routes require authentication
router.use(authenticateToken);

// 1. Daily Summary Report
router.get('/summary', reportController.getReportSummary);

// 2. Weekly Department Report
router.get('/department', reportController.getReportDepartment);

// 3. Critical Issues Report
router.get('/issues', reportController.getReportIssues);

// 4. Action Effectiveness Report
router.get('/actions', reportController.getReportActions);

// 5. Survey Form Submission Summary Reports (HOD role)
router.get('/survey-report', reportController.getSurveyReport);

// 6. Management Department Survey Reports (Daily, Weekly, Student Survey, Faculty Survey)
router.get('/department-survey', reportController.getDepartmentSurveyReport);

module.exports = router;

