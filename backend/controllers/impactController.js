const impactService = require('../services/impactService');
const actionService = require('../services/actionService');
const { OFFICIAL_DEPARTMENTS } = require('../services/analyticsService');

/**
 * Verify access permission for impact endpoints
 */
async function verifyImpactAccess(req, res) {
  const { role, department: userDept } = req.user;

  if (role === 'student' || role === 'faculty') {
    res.status(403).json({
      success: false,
      message: `Forbidden: ${role === 'faculty' ? 'Faculty' : 'Students'} are not authorized to view administrative impact metrics.`
    });
    return { error: true };
  }

  const { actionId } = req.params;
  const action = await actionService.getActionById(actionId, null);

  if (!action) {
    res.status(404).json({
      success: false,
      message: `Action with ID "${actionId}" not found.`
    });
    return { error: true };
  }

  if (role === 'hod') {
    if (!userDept || action.department.trim().toLowerCase() !== userDept.trim().toLowerCase()) {
      res.status(403).json({
        success: false,
        message: `Forbidden: HOD of "${userDept}" cannot view impact metrics for action in "${action.department}".`
      });
      return { error: true };
    }
  }

  return { action, error: false };
}

/**
 * GET /api/impact/:actionId
 * POST /api/impact/:actionId/evaluate
 */
async function evaluateImpact(req, res) {
  try {
    // POST /evaluate is restricted to HOD (Management is read-only)
    if (req.method === 'POST' && req.user.role !== 'hod') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only HOD can trigger action impact evaluation.'
      });
    }

    const { action, error } = await verifyImpactAccess(req, res);
    if (error) return;

    const windowDays = req.query.windowDays || req.body.windowDays || 14;
    const data = await impactService.evaluateActionImpact(req.params.actionId, null, windowDays);

    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('[IMPACT CONTROLLER ERROR - evaluateImpact]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to evaluate action impact.',
      error: error.message
    });
  }
}

/**
 * GET /api/impact/:actionId/before
 */
async function getBefore(req, res) {
  try {
    const { action, error } = await verifyImpactAccess(req, res);
    if (error) return;

    const windowDays = req.query.windowDays || 14;
    const data = await impactService.getBeforeMetrics(req.params.actionId, null, windowDays);

    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('[IMPACT CONTROLLER ERROR - getBefore]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve pre-action metrics.',
      error: error.message
    });
  }
}

/**
 * GET /api/impact/:actionId/after
 */
async function getAfter(req, res) {
  try {
    const { action, error } = await verifyImpactAccess(req, res);
    if (error) return;

    const windowDays = req.query.windowDays || 14;
    const data = await impactService.getAfterMetrics(req.params.actionId, null, windowDays);

    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('[IMPACT CONTROLLER ERROR - getAfter]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve post-action metrics.',
      error: error.message
    });
  }
}

/**
 * GET /api/impact/overview
 * Institution-wide impact overview for Management
 */
async function getOverview(req, res) {
  try {
    const { role } = req.user;

    // Strict Management authorization
    if (role !== 'management') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only Management can view the institution-wide impact overview.'
      });
    }

    const requestedDept = req.query.department;
    let validatedDept = null;

    if (requestedDept && requestedDept !== 'All Departments' && requestedDept !== 'ALL') {
      const matched = OFFICIAL_DEPARTMENTS.find(
        d => d.toLowerCase() === requestedDept.trim().toLowerCase()
      );
      if (!matched) {
        return res.status(400).json({
          success: false,
          message: `Invalid department "${requestedDept}". Must be one of: ${OFFICIAL_DEPARTMENTS.join(', ')}.`
        });
      }
      validatedDept = matched;
    }

    const data = await impactService.getInstitutionImpactOverview({ department: validatedDept });

    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('[IMPACT CONTROLLER ERROR - getOverview]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve institution impact overview.',
      error: error.message
    });
  }
}

module.exports = {
  evaluateImpact,
  getBefore,
  getAfter,
  getOverview
};
