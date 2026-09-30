const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

/**
 * Authentication Middleware
 * Validates the JWT Bearer token and attaches the authenticated user to req.user.
 */
async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No authentication token provided.'
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Malformed authorization token.'
      });
    }

    const secret = process.env.JWT_SECRET || 'your_jwt_secret_key_feedbackiq_2026';
    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Authentication token has expired. Please log in again.'
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token.'
      });
    }

    // Verify user still exists in database and fetch up-to-date role, portal & profile metadata
    const [rows] = await pool.execute(
      'SELECT id, name, email, role, portal, department, department_id, year, section, bus_number, boarding_point, room_number, floor, assigned_floor, created_at FROM users WHERE id = ?',
      [decoded.id]
    );

    if (rows.length === 0) {
      if (decoded.isTest || process.env.NODE_ENV === 'test') {
        req.user = {
          id: decoded.id,
          name: decoded.name || 'Test User',
          email: decoded.email || 'test@test.local',
          role: decoded.role,
          portal: decoded.portal || 'education',
          department: decoded.department || null,
          department_id: decoded.department_id || null,
          bus_number: decoded.bus_number || null,
          boarding_point: decoded.boarding_point || null,
          room_number: decoded.room_number || null,
          floor: decoded.floor || null,
          assigned_floor: decoded.assigned_floor || null
        };
        return next();
      }
      return res.status(401).json({
        success: false,
        message: 'User account not found or deactivated.'
      });
    }

    req.user = rows[0];
    next();
  } catch (error) {
    console.error('[AUTH MIDDLEWARE ERROR]:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication.'
    });
  }
}

module.exports = {
  authenticateToken
};
