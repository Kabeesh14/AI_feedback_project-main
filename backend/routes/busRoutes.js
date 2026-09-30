const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { requirePortal, resolveTrustedBus } = require('../middleware/roleMiddleware');

const feedbackController = require('../controllers/feedbackController');
const analyticsController = require('../controllers/analyticsController');
const actionController = require('../controllers/actionController');
const formController = require('../controllers/formController');

// All Bus routes require authenticated session and bus portal access (or management)
router.use(authenticateToken);
router.use(requirePortal('bus'));

// Middleware to enforce portal and bus scope
function enforceBusScope(req, res, next) {
  req.query.portal = 'bus';
  if (req.body && typeof req.body === 'object') {
    req.body.portal = 'bus';
  }
  const trustedBus = resolveTrustedBus(req.user, req.query.bus_number || (req.body && req.body.bus_number));
  if (trustedBus) {
    req.query.bus_number = trustedBus;
    if (req.body && typeof req.body === 'object') {
      req.body.bus_number = trustedBus;
    }
  }
  next();
}

router.get('/feedback', enforceBusScope, feedbackController.getAllFeedback);
router.post('/feedback', enforceBusScope, feedbackController.createFeedback);
router.get('/issues', enforceBusScope, analyticsController.getIssues);
router.get('/actions', enforceBusScope, actionController.getActions);
router.post('/actions', enforceBusScope, actionController.createAction);
router.get('/analytics', enforceBusScope, analyticsController.getDashboard);
router.get('/forms', enforceBusScope, formController.getForms);

module.exports = router;
