const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const { authenticateToken } = require('../middleware/authMiddleware');

// All alert routes require authentication
router.use(authenticateToken);

// 1. Read all alerts (must be before /:id)
router.put('/read-all', alertController.markAllRead);

// 2. List alerts
router.get('/', alertController.getAlerts);

// 3. Single alert
router.get('/:id', alertController.getAlertById);

// 4. Update alert status
router.put('/:id/status', alertController.updateStatus);

// 5. Mark single alert as read
router.put('/:id/read', alertController.markRead);

// 6. Acknowledge alert
router.post('/:id/acknowledge', alertController.acknowledge);

module.exports = router;
