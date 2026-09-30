const analyticsService = require('../services/analyticsService');
const { OFFICIAL_DEPARTMENTS } = analyticsService;

/**
 * Helper to resolve and strictly validate department scope for reports
 */
function resolveReportDepartment(req, res) {
  const { role, department: userDept } = req.user;
  const requestedDept = req.query.department;

  // 1. Students and Faculty forbidden from administrative reports
  if (role === 'student' || role === 'faculty') {
    res.status(403).json({
      success: false,
      message: `Forbidden: ${role === 'faculty' ? 'Faculty' : 'Students'} are not authorized to access administrative reports.`
    });
    return { error: true };
  }

  // 2. HOD strictly restricted to req.user.department
  if (role === 'hod') {
    if (!userDept) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: HOD profile does not have an assigned department.'
      });
      return { error: true };
    }

    if (requestedDept) {
      const normRequested = requestedDept.trim().toLowerCase();
      const normUser = userDept.trim().toLowerCase();
      if (normRequested !== normUser) {
        res.status(403).json({
          success: false,
          message: `Forbidden: HOD of "${userDept}" is not authorized to access reports for "${requestedDept}".`
        });
        return { error: true };
      }
    }

    return { department: userDept, error: false };
  }

  // 3. Management has institution-wide oversight with validation
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

  res.status(403).json({
    success: false,
    message: 'Forbidden: Unauthorized role.'
  });
  return { error: true };
}

/**
 * GET /api/reports/summary
 * Daily Feedback Summary Report (r1)
 */
async function getReportSummary(req, res) {
  try {
    const { department, error } = resolveReportDepartment(req, res);
    if (error) return;

    const data = await analyticsService.getReportData('summary', department);
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('[REPORT CONTROLLER ERROR - Summary]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate daily summary report.',
      error: error.message
    });
  }
}

/**
 * GET /api/reports/department
 * Weekly Department Performance Report (r2)
 */
async function getReportDepartment(req, res) {
  try {
    const { department, error } = resolveReportDepartment(req, res);
    if (error) return;

    const data = await analyticsService.getReportData('department', department);
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('[REPORT CONTROLLER ERROR - Department]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate department performance report.',
      error: error.message
    });
  }
}

/**
 * GET /api/reports/issues
 * Critical and High-Priority Issues Report (r4)
 */
async function getReportIssues(req, res) {
  try {
    const { department, error } = resolveReportDepartment(req, res);
    if (error) return;

    const data = await analyticsService.getReportData('issues', department);
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('[REPORT CONTROLLER ERROR - Issues]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate critical issues report.',
      error: error.message
    });
  }
}

/**
 * GET /api/reports/actions
 * Action Effectiveness & Impact Measurement Report (r5)
 */
async function getReportActions(req, res) {
  try {
    const { department, error } = resolveReportDepartment(req, res);
    if (error) return;

    const data = await analyticsService.getReportData('actions', department);
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('[REPORT CONTROLLER ERROR - Actions]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate action effectiveness report.',
      error: error.message
    });
  }
}

/**
 * GET /api/reports/survey-report
 * Survey form submission summary reports (Daily/Weekly Student/Faculty)
 */
async function getSurveyReport(req, res) {
  try {
    const { department, error } = resolveReportDepartment(req, res);
    if (error) return;

    const reportType = req.query.type || 'daily-student';
    const data = await analyticsService.getSurveyFormReportData(reportType, department);

    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('[REPORT CONTROLLER ERROR - Survey Report]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate survey submission report.',
      error: error.message
    });
  }
}

/**
 * GET /api/reports/department-survey
 * Management Department Survey Reports (Daily, Weekly, Student Survey, Faculty Survey)
 */
async function getDepartmentSurveyReport(req, res) {
  try {
    const { department, error } = resolveReportDepartment(req, res);
    if (error) return;

    const reportType = req.query.type || 'dept-survey-daily';
    const data = await analyticsService.getManagementDepartmentSurveyReport(reportType, department);

    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('[REPORT CONTROLLER ERROR - Department Survey Report]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate department survey report.',
      error: error.message
    });
  }
}

module.exports = {
  resolveReportDepartment,
  getReportSummary,
  getReportDepartment,
  getReportIssues,
  getReportActions,
  getSurveyReport,
  getDepartmentSurveyReport
};

