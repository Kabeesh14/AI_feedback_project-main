const analyticsService = require('../services/analyticsService');
const aiService = require('../services/aiService');
const { OFFICIAL_DEPARTMENTS } = analyticsService;

/**
 * Helper to resolve and strictly validate department scope by user role
 * Returns { department, error: false } or sends HTTP response and returns { error: true }
 */
function resolveAnalyticsDepartment(req, res) {
  const { role, department: userDept, bus_number, assigned_floor } = req.user;
  const requestedDept = req.query.department;
  const requestedPortal = req.query.portal;
  const requestedBus = req.query.bus_number;
  const requestedFloor = req.query.floor;

  // 1. Students are forbidden from administrative analytics
  if (role === 'student') {
    res.status(403).json({
      success: false,
      message: 'Forbidden: Students are not authorized to access administrative analytics.'
    });
    return { error: true };
  }

  // 2. Bus Incharge
  if (role === 'bus_incharge') {
    if (requestedBus && requestedBus.trim().toLowerCase() !== (bus_number || '').trim().toLowerCase()) {
      res.status(403).json({
        success: false,
        message: `Forbidden: You are assigned to "${bus_number}" and cannot access analytics for "${requestedBus}".`
      });
      return { error: true };
    }
    return { department: null, portal: 'bus', bus_number, error: false };
  }

  // 3. Transport Incharge
  if (role === 'transport_incharge') {
    return { department: null, portal: 'bus', bus_number: requestedBus || null, error: false };
  }

  // 4. Hostel Warden
  if (role === 'hostel_warden') {
    if (requestedFloor && requestedFloor.trim().toLowerCase() !== (assigned_floor || '').trim().toLowerCase()) {
      res.status(403).json({
        success: false,
        message: `Forbidden: You are assigned to "${assigned_floor}" and cannot access analytics for "${requestedFloor}".`
      });
      return { error: true };
    }
    return { department: null, portal: 'hostel', floor: assigned_floor, error: false };
  }

  // 5. HOD and Faculty are strictly restricted to req.user.department
  if (role === 'hod' || role === 'faculty') {
    if (!userDept) {
      res.status(403).json({
        success: false,
        message: `Forbidden: ${role === 'faculty' ? 'Faculty' : 'HOD'} profile does not have an assigned department.`
      });
      return { error: true };
    }

    if (requestedDept) {
      const normRequested = requestedDept.trim().toLowerCase();
      const normUser = userDept.trim().toLowerCase();
      if (normRequested !== normUser) {
        res.status(403).json({
          success: false,
          message: `Forbidden: ${role === 'faculty' ? 'Faculty' : 'HOD'} of "${userDept}" is not authorized to access data for "${requestedDept}".`
        });
        return { error: true };
      }
    }

    return { department: userDept, portal: 'education', error: false };
  }

  // 6. Management has institution-wide oversight with portal and department filter validation
  if (role === 'management') {
    const effPortal = requestedPortal ? requestedPortal.toLowerCase() : null;
    if (effPortal === 'bus') {
      return { department: null, portal: 'bus', bus_number: requestedBus || null, error: false };
    }
    if (effPortal === 'hostel') {
      return { department: null, portal: 'hostel', floor: requestedFloor || null, error: false };
    }

    if (!requestedDept || requestedDept.toLowerCase() === 'all' || requestedDept.toLowerCase() === 'all departments') {
      return { department: null, portal: effPortal, error: false };
    }

    const matched = OFFICIAL_DEPARTMENTS.find(d => d.toLowerCase() === requestedDept.trim().toLowerCase());
    if (!matched) {
      res.status(400).json({
        success: false,
        message: `Invalid department "${requestedDept}". Must be one of: ${OFFICIAL_DEPARTMENTS.join(', ')}.`
      });
      return { error: true };
    }

    return { department: matched, portal: effPortal || 'education', error: false };
  }

  res.status(403).json({
    success: false,
    message: 'Forbidden: Unauthorized role.'
  });
  return { error: true };
}

/**
 * GET /api/analytics/dashboard
 * Aggregated dashboard metrics, KPIs, distributions, top themes and issues
 */
async function getDashboard(req, res) {
  try {
    const scope = resolveAnalyticsDepartment(req, res);
    if (scope.error) return;

    const data = await analyticsService.getDashboardMetrics(scope.department, {
      ...req.query,
      portal: scope.portal,
      bus_number: scope.bus_number,
      floor: scope.floor
    });
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('[ANALYTICS CONTROLLER ERROR - Dashboard]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard metrics.',
      error: error.message
    });
  }
}

/**
 * GET /api/analytics/pulse
 * Deterministic Institutional / Departmental Pulse Score (0-100)
 */
async function getPulse(req, res) {
  try {
    const scope = resolveAnalyticsDepartment(req, res);
    if (scope.error) return;

    const data = await analyticsService.getPulseMetrics(scope.department, {
      ...req.query,
      portal: scope.portal,
      bus_number: scope.bus_number,
      floor: scope.floor
    });
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('[ANALYTICS CONTROLLER ERROR - Pulse]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to calculate pulse metrics.',
      error: error.message
    });
  }
}

/**
 * GET /api/analytics/summary
 * "What Changed Today" delta analysis and activity cards
 */
async function getSummary(req, res) {
  try {
    const scope = resolveAnalyticsDepartment(req, res);
    if (scope.error) return;

    const data = await analyticsService.getWhatChangedToday(scope.department, {
      ...req.query,
      portal: scope.portal,
      bus_number: scope.bus_number,
      floor: scope.floor
    });
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('[ANALYTICS CONTROLLER ERROR - Summary]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve daily summary metrics.',
      error: error.message
    });
  }
}

/**
 * GET /api/analytics/themes
 * Themes/categories breakdown with percentages and 7-day sparkline trend
 */
async function getThemes(req, res) {
  try {
    const scope = resolveAnalyticsDepartment(req, res);
    if (scope.error) return;

    let data;
    const isEducation = !scope.portal || scope.portal === 'education';
    if (
      isEducation && (
        req.user?.role === 'hod' ||
        req.query?.role === 'hod' ||
        req.user?.role === 'management' ||
        req.query?.role === 'management'
      )
    ) {
      data = await aiService.calculateDepartmentThemesFromSurveys(scope.department, req.query);
    } else {
      data = await analyticsService.getThemeAnalytics(scope.department, {
        ...req.query,
        portal: scope.portal,
        bus_number: scope.bus_number,
        floor: scope.floor
      });
    }

    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('[ANALYTICS CONTROLLER ERROR - Themes]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve theme analytics.',
      error: error.message
    });
  }
}

/**
 * GET /api/analytics/issues
 * Issues list with complaint volume, negative %, priority, and emerging rationale
 */
async function getIssues(req, res) {
  try {
    const scope = resolveAnalyticsDepartment(req, res);
    if (scope.error) return;

    let data;
    const isEducation = !scope.portal || scope.portal === 'education';
    if (
      isEducation && (
        req.user?.role === 'faculty' ||
        req.query?.role === 'faculty' ||
        req.user?.role === 'hod' ||
        req.query?.role === 'hod' ||
        req.user?.role === 'management' ||
        req.query?.role === 'management'
      )
    ) {
      data = await aiService.calculateDepartmentIssuesFromStudentFeedback(scope.department, req.query);
    } else {
      data = await analyticsService.getIssueAnalytics(scope.department, {
        ...req.query,
        portal: scope.portal,
        bus_number: scope.bus_number,
        floor: scope.floor
      });
    }

    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('[ANALYTICS CONTROLLER ERROR - Issues]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve issue analytics.',
      error: error.message
    });
  }
}

/**
 * GET /api/analytics/root-causes
 * Contributing factors with confidence scores and observed evidence
 */
async function getRootCauses(req, res) {
  try {
    const scope = resolveAnalyticsDepartment(req, res);
    if (scope.error) return;

    const data = await analyticsService.getRootCauseAnalytics(scope.department, {
      ...req.query,
      portal: scope.portal,
      bus_number: scope.bus_number,
      floor: scope.floor
    });
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('[ANALYTICS CONTROLLER ERROR - Root Causes]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve root cause analytics.',
      error: error.message
    });
  }
}

/**
 * GET /api/analytics/trends
 * Continuous daily aggregated time-series (7, 14, 30 days)
 */
async function getTrends(req, res) {
  try {
    const scope = resolveAnalyticsDepartment(req, res);
    if (scope.error) return;

    const days = req.query.days || 7;
    const data = await analyticsService.getTrendAnalytics(scope.department, days, {
      ...req.query,
      portal: scope.portal,
      bus_number: scope.bus_number,
      floor: scope.floor
    });
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('[ANALYTICS CONTROLLER ERROR - Trends]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve trend analytics.',
      error: error.message
    });
  }
}

/**
 * GET /api/analytics/department-comparison
 * Management-only comparative analytics across all 9 official departments
 */
async function getDepartmentComparison(req, res) {
  try {
    // 1. Role validation: Strictly Management only
    if (req.user.role !== 'management') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Department comparison is restricted to management users.'
      });
    }

    let selectedDepts = null;
    if (req.query.departments) {
      selectedDepts = req.query.departments.split(',').map(d => d.trim()).filter(Boolean);
    }

    const data = await analyticsService.getDepartmentComparison(selectedDepts, req.query);
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('[ANALYTICS CONTROLLER ERROR - Comparison]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate department comparison.',
      error: error.message
    });
  }
}

module.exports = {
  resolveAnalyticsDepartment,
  getDashboard,
  getPulse,
  getSummary,
  getThemes,
  getIssues,
  getRootCauses,
  getTrends,
  getDepartmentComparison
};
