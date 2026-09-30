const express = require('express');
const router = express.Router();
const actionController = require('../controllers/actionController');
const { authenticateToken } = require('../middleware/authMiddleware');

// All action routes require authentication
router.use(authenticateToken);

// 1. Create action
router.post('/', actionController.createAction);

// 2. List actions
router.get('/', actionController.getActions);

// 3. Single action
router.get('/:id', actionController.getActionById);

// 4. Update action
router.put('/:id', actionController.updateAction);

// 5. Delete action
router.delete('/:id', actionController.deleteAction);

// 6. Progress update audit entry
router.post('/:id/updates', actionController.addActionUpdate);

module.exports = router;
