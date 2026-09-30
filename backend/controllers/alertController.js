const alertService = require('../services/alertService');
const { OFFICIAL_DEPARTMENTS } = require('../services/analyticsService');

/**
 * Resolve and validate department scope for alerts based on role
 */
function resolveAlertDepartment(req, res) {
  const { role, department: userDept } = req.user;
  const requestedDept = req.query.department;

  if (role === 'student' || role === 'faculty') {
    res.status(403).json({
      success: false,
      message: `Forbidden: ${role === 'faculty' ? 'Faculty' : 'Students'} are not authorized to access administrative alerts.`
    });
    return { error: true };
  }

  if (role === 'hod') {
    if (!userDept) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: HOD profile does not have an assigned department.'
      });
      return { error: true };
    }

    if (requestedDept) {
      const normReq = requestedDept.trim().toLowerCase();
      const normUser = userDept.trim().toLowerCase();
      if (normReq !== normUser) {
        res.status(403).json({
          success: false,
          message: `Forbidden: HOD of "${userDept}" is not authorized to access alerts for "${requestedDept}".`
        });
        return { error: true };
      }
    }

    return { department: userDept, error: false };
  }

  if (role === 'management') {
    if (!requestedDept || requestedDept.toLowerCase() === 'all' || requestedDept.toLowerCase() === 'all departments') {
      return { department: null, error: false };
    }

    const matched = OFFICIAL_DEPARTMENTS.find(d => d.toLowerCase() === requestedDept.trim().toLowerCase());
    if (!matched) {
      res.status(400).json({
        success: false,
        message: `Invalid department "${requestedDept}". Must be one of: ${OFFICIAL_DEPARTMENTS.join(', ')}.`
      });
      return { error: true };
    }

    return { department: matched, error: false };
  }

  res.status(403).json({ success: false, message: 'Forbidden: Unauthorized role.' });
  return { error: true };
}

/**
 * GET /api/alerts
 */
async function getAlerts(req, res) {
  try {
    const { department, error } = resolveAlertDepartment(req, res);
    if (error) return;

    const data = await alertService.getAlerts(department, req.query);
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('[ALERT CONTROLLER ERROR - getAlerts]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve alerts.',
      error: error.message
    });
  }
}

/**
 * GET /api/alerts/:id
 */
async function getAlertById(req, res) {
  try {
    const { department, error } = resolveAlertDepartment(req, res);
    if (error) return;

    const alert = await alertService.getAlertById(req.params.id, department);
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: `Alert with ID "${req.params.id}" not found or unauthorized.`
      });
    }

    return res.status(200).json({
      success: true,
      data: alert
    });
  } catch (error) {
    console.error('[ALERT CONTROLLER ERROR - getAlertById]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve alert.',
      error: error.message
    });
  }
}

/**
 * PUT /api/alerts/:id/status
 */
async function updateStatus(req, res) {
  try {
    const { department, error } = resolveAlertDepartment(req, res);
    if (error) return;

    const { status } = req.body;
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required.'
      });
    }

    const updated = await alertService.updateAlertStatus(req.params.id, status, department);
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: `Alert with ID "${req.params.id}" not found or unauthorized.`
      });
    }

    return res.status(200).json({
      success: true,
      message: `Alert status updated to "${status}".`,
      data: updated
    });
  } catch (error) {
    console.error('[ALERT CONTROLLER ERROR - updateStatus]:', error);
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * PUT /api/alerts/:id/read
 */
async function markRead(req, res) {
  try {
    const { department, error } = resolveAlertDepartment(req, res);
    if (error) return;

    const updated = await alertService.markAlertRead(req.params.id, department);
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: `Alert with ID "${req.params.id}" not found or unauthorized.`
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Alert marked as read.',
      data: updated
    });
  } catch (error) {
    console.error('[ALERT CONTROLLER ERROR - markRead]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark alert as read.',
      error: error.message
    });
  }
}

/**
 * PUT /api/alerts/read-all
 */
async function markAllRead(req, res) {
  try {
    const { department, error } = resolveAlertDepartment(req, res);
    if (error) return;

    const result = await alertService.markAllAlertsRead(department);
    return res.status(200).json({
      success: true,
      message: `Marked ${result.affectedRows} alerts as read.`
    });
  } catch (error) {
    console.error('[ALERT CONTROLLER ERROR - markAllRead]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark all alerts as read.',
      error: error.message
    });
  }
}

/**
 * POST /api/alerts/:id/acknowledge
 */
async function acknowledge(req, res) {
  try {
    const { department, error } = resolveAlertDepartment(req, res);
    if (error) return;

    const updated = await alertService.acknowledgeAlert(req.params.id, department);
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: `Alert with ID "${req.params.id}" not found or unauthorized.`
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Alert acknowledged.',
      data: updated
    });
  } catch (error) {
    console.error('[ALERT CONTROLLER ERROR - acknowledge]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to acknowledge alert.',
      error: error.message
    });
  }
}

module.exports = {
  getAlerts,
  getAlertById,
  updateStatus,
  markRead,
  markAllRead,
  acknowledge
};
