const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { requirePortal, resolveTrustedFloor } = require('../middleware/roleMiddleware');

const feedbackController = require('../controllers/feedbackController');
const analyticsController = require('../controllers/analyticsController');
const actionController = require('../controllers/actionController');
const formController = require('../controllers/formController');

// All Hostel routes require authenticated session and hostel portal access (or management)
router.use(authenticateToken);
router.use(requirePortal('hostel'));

// Middleware to enforce portal and floor scope
function enforceHostelScope(req, res, next) {
  req.query.portal = 'hostel';
  if (req.body && typeof req.body === 'object') {
    req.body.portal = 'hostel';
  }
  const trustedFloor = resolveTrustedFloor(req.user, req.query.floor || (req.body && req.body.floor));
  if (trustedFloor) {
    req.query.floor = trustedFloor;
    if (req.body && typeof req.body === 'object') {
      req.body.floor = trustedFloor;
    }
  }
  next();
}

router.get('/feedback', enforceHostelScope, feedbackController.getAllFeedback);
router.post('/feedback', enforceHostelScope, feedbackController.createFeedback);
router.get('/issues', enforceHostelScope, analyticsController.getIssues);
router.get('/actions', enforceHostelScope, actionController.getActions);
router.post('/actions', enforceHostelScope, actionController.createAction);
router.get('/analytics', enforceHostelScope, analyticsController.getDashboard);
router.get('/forms', enforceHostelScope, formController.getForms);

module.exports = router;
