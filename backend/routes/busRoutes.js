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

// 8. Resolve Bus Incharge for a specific bus number
router.get('/incharge/:busNumber', async (req, res) => {
  try {
    const { busNumber } = req.params;
    const { pool } = require('../config/db');
    const { isMatchingBus, normalizeBusNumber } = require('../utils/busUtils');

    const [rows] = await pool.query(
      `SELECT id, name, email, bus_number FROM users WHERE role = 'bus_incharge'`
    );
    const matched = rows.find(r => isMatchingBus(r.bus_number, busNumber));
    if (matched) {
      return res.status(200).json({
        success: true,
        data: {
          name: matched.name,
          email: matched.email,
          bus_number: matched.bus_number,
          found: true
        }
      });
    }

    // Fallback: check if feedback record has assigned_to for this bus
    const [fbRows] = await pool.query(
      `SELECT assigned_to FROM feedback WHERE bus_number = ? AND assigned_to IS NOT NULL AND assigned_to != '' LIMIT 1`,
      [busNumber]
    );
    if (fbRows.length > 0 && fbRows[0].assigned_to) {
      return res.status(200).json({
        success: true,
        data: {
          name: fbRows[0].assigned_to,
          found: true
        }
      });
    }

    const norm = normalizeBusNumber(busNumber) || busNumber;
    return res.status(200).json({
      success: true,
      data: {
        name: `Bus ${norm} Incharge`,
        found: false
      }
    });
  } catch (err) {
    console.error('[BUS INCHARGE RESOLVER ERROR]:', err);
    return res.status(500).json({ success: false, message: 'Failed to resolve bus incharge.' });
  }
});

// 9. List all bus incharges
router.get('/incharges', async (req, res) => {
  try {
    const { pool } = require('../config/db');
    const [rows] = await pool.query(
      `SELECT id, name, email, bus_number FROM users WHERE role = 'bus_incharge'`
    );
    return res.status(200).json({
      success: true,
      data: rows
    });
  } catch (err) {
    console.error('[BUS INCHARGES LIST ERROR]:', err);
    return res.status(500).json({ success: false, message: 'Failed to list bus incharges.' });
  }
});

module.exports = router;
