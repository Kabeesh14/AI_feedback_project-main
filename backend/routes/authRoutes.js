const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireDepartmentAccess, requireStudentSelf } = require('../middleware/roleMiddleware');

// Public authentication routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/google', authController.googleAuth);
router.get('/google/callback', authController.googleCallback);
router.post('/google/register', authController.completeGoogleRegistration);
router.post('/google/student-register', authController.completeGoogleRegistration);

// Protected profile routes
router.get('/me', authenticateToken, authController.getMe);
router.put('/profile', authenticateToken, authController.updateProfile);

// Department isolation test endpoint
// Verifies:
// - Management can access ANY department
// - HOD can ONLY access their own assigned department (returns 403 on another department)
// - Student cannot access departmental administrative data (returns 403)
router.get(
  '/test/department/:department',
  authenticateToken,
  requireDepartmentAccess((req) => req.params.department),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: `Access granted to "${req.params.department}" data for role "${req.user.role}".`,
      data: {
        department: req.params.department,
        accessedBy: req.user.email,
        userRole: req.user.role,
        userDepartment: req.user.department
      }
    });
  }
);

// Student record isolation test endpoint
// Verifies:
// - Student can ONLY access their own student record (returns 403 on another student's record)
// - Management can access any student record
router.get(
  '/test/student-record/:studentId',
  authenticateToken,
  requireStudentSelf((req) => req.params.studentId),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: `Access granted to student record #${req.params.studentId}.`,
      data: {
        studentId: req.params.studentId,
        accessedBy: req.user.email,
        userRole: req.user.role
      }
    });
  }
);

module.exports = router;
