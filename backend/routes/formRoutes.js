const express = require('express');
const router = express.Router();
const formController = require('../controllers/formController');
const { authenticateToken } = require('../middleware/authMiddleware');

// All form routes require authentication
router.use(authenticateToken);

// Specific sub-routes (placed before :id to prevent collision)
router.get('/student', formController.getStudentForms);
router.get('/faculty', formController.getFacultyForms);

// Form collection routes
router.post('/', formController.createForm);
router.get('/', formController.getForms);

// Single form operations
router.get('/:id', formController.getFormById);
router.put('/:id', formController.updateForm);

// Form lifecycle management
router.post('/:id/publish', formController.publishForm);
router.post('/:id/close', formController.closeForm);

// Question management (draft forms only)
router.post('/:id/questions', formController.addQuestion);
router.put('/:id/questions/:questionId', formController.updateQuestion);
router.delete('/:id/questions/:questionId', formController.deleteQuestion);

// Participation tracking (HOD, Faculty within department, Management institution-wide)
router.get('/:id/participation', formController.getFormParticipation);

// Student submission endpoints
router.get('/:id/submission-status', formController.getSubmissionStatus);
router.post('/:id/submit', formController.submitFormResponse);

// Collective AI Analysis (Phase 4)
router.post('/:id/analyze', formController.analyzeForm);
router.get('/:id/analysis', formController.getFormAnalysis);

module.exports = router;
