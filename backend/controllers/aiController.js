const { pool } = require('../config/db');
const aiService = require('../services/aiService');

/**
 * POST /api/ai/analyze-feedback/:feedbackId
 * Trigger or retry AI analysis for a specific feedback
 */
async function triggerFeedbackAnalysis(req, res) {
  try {
    const feedbackId = parseInt(req.params.feedbackId, 10);
    if (isNaN(feedbackId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid feedback ID.'
      });
    }

    const [rows] = await pool.execute('SELECT * FROM feedback WHERE id = ?', [feedbackId]);
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Feedback #${feedbackId} not found.`
      });
    }

    const fb = rows[0];

    // Authorization checks
    if (req.user.role === 'student' && fb.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only analyze your own feedback.'
      });
    }

    if (req.user.role === 'hod' && fb.department.toLowerCase() !== req.user.department.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: HOD of "${req.user.department}" cannot analyze feedback from "${fb.department}".`
      });
    }

    // Process analysis
    await aiService.processFeedbackAI(feedbackId, fb.comment, fb.category);

    const [updatedRows] = await pool.execute('SELECT * FROM feedback WHERE id = ?', [feedbackId]);
    const updated = updatedRows[0];

    return res.status(200).json({
      success: true,
      message: 'AI analysis completed successfully.',
      data: {
        feedbackId: updated.id,
        sentiment: updated.sentiment,
        sentimentScore: updated.sentiment_score,
        theme: updated.theme,
        priority: updated.priority,
        summary: updated.ai_summary,
        confidence: updated.ai_confidence,
        provider: updated.ai_provider,
        status: updated.ai_status,
        analyzedAt: updated.ai_analyzed_at,
        issueId: updated.issue_id
      }
    });
  } catch (error) {
    console.error('[TRIGGER ANALYSIS ERROR]:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error triggering AI analysis.'
    });
  }
}

/**
 * GET /api/ai/feedback/:feedbackId
 * Retrieve AI analysis for a specific feedback
 */
async function getFeedbackAnalysis(req, res) {
  try {
    const feedbackId = parseInt(req.params.feedbackId, 10);
    if (isNaN(feedbackId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid feedback ID.'
      });
    }

    const [rows] = await pool.execute('SELECT * FROM feedback WHERE id = ?', [feedbackId]);
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Feedback #${feedbackId} not found.`
      });
    }

    const fb = rows[0];

    // Authorization check
    if (req.user.role === 'student' && fb.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Students cannot access another student\'s AI analysis.'
      });
    }

    if (req.user.role === 'hod' && fb.department.toLowerCase() !== req.user.department.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: HOD of "${req.user.department}" cannot access analysis for "${fb.department}".`
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        feedbackId: fb.id,
        department: fb.department,
        category: fb.category,
        sentiment: fb.sentiment,
        sentimentScore: fb.sentiment_score,
        theme: fb.theme,
        priority: fb.priority,
        summary: fb.ai_summary,
        confidence: fb.ai_confidence,
        provider: fb.ai_provider,
        status: fb.ai_status,
        errorMessage: fb.ai_error_message,
        analyzedAt: fb.ai_analyzed_at,
        issueId: fb.issue_id
      }
    });
  } catch (error) {
    console.error('[GET FEEDBACK ANALYSIS ERROR]:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error retrieving AI analysis.'
    });
  }
}

/**
 * GET /api/ai/issues/:issueId
 * Retrieve an issue with AI intelligence and metrics
 */
async function getIssueIntelligence(req, res) {
  try {
    const issueId = parseInt(req.params.issueId, 10);
    if (isNaN(issueId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid issue ID.'
      });
    }

    const [issues] = await pool.execute('SELECT * FROM issues WHERE id = ?', [issueId]);
    if (issues.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Issue #${issueId} not found.`
      });
    }

    const issue = issues[0];

    // Role & Scope access checks
    if (req.user.role === 'student' || req.user.role === 'faculty') {
      return res.status(403).json({
        success: false,
        message: `Forbidden: ${req.user.role === 'faculty' ? 'Faculty members' : 'Students'} cannot access administrative issue intelligence.`
      });
    }

    const issuePortal = (issue.portal || 'education').toLowerCase();

    if (req.user.role === 'bus_incharge') {
      if (issuePortal !== 'bus' || (issue.bus_number && issue.bus_number !== req.user.bus_number)) {
        return res.status(403).json({
          success: false,
          message: `Forbidden: You are assigned to "${req.user.bus_number}" and cannot access this issue.`
        });
      }
    } else if (req.user.role === 'transport_incharge') {
      if (issuePortal !== 'bus') {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Transport Incharge can only access Bus portal issues.'
        });
      }
    } else if (req.user.role === 'hostel_warden') {
      if (issuePortal !== 'hostel' || (issue.floor && issue.floor !== req.user.assigned_floor)) {
        return res.status(403).json({
          success: false,
          message: `Forbidden: You are assigned to "${req.user.assigned_floor}" and cannot access this issue.`
        });
      }
    } else if (req.user.role === 'hod') {
      if (issuePortal !== 'education' || !issue.department || issue.department.toLowerCase() !== (req.user.department || '').toLowerCase()) {
        return res.status(403).json({
          success: false,
          message: `Forbidden: HOD of "${req.user.department}" cannot access issues from "${issue.department || issuePortal}".`
        });
      }
    }

    // Get linked possible causes
    const [causes] = await pool.execute(
      'SELECT * FROM possible_causes WHERE issue_id = ? ORDER BY confidence DESC',
      [issueId]
    );

    return res.status(200).json({
      success: true,
      data: {
        id: issue.id,
        issueCode: issue.issue_code,
        title: issue.title,
        portal: issue.portal || 'education',
        bus_number: issue.bus_number || null,
        floor: issue.floor || null,
        department: issue.department,
        category: issue.category,
        priority: issue.priority,
        status: issue.status,
        impactScore: issue.impact_score,
        isEmerging: Boolean(issue.is_emerging),
        emergingReason: issue.emerging_reason,
        feedbackCount: issue.feedback_count,
        rootCauseSummary: issue.root_cause,
        fiveWhys: issue.five_whys,
        assignedTo: issue.assigned_to,
        createdAt: issue.created_at,
        updatedAt: issue.updated_at,
        possibleCauses: causes.map(c => ({
          id: c.id,
          cause: c.cause_text,
          likelihood: c.likelihood,
          confidence: c.confidence,
          evidence: c.evidence,
          supportingFeedbackCount: c.supporting_count,
          verified: Boolean(c.verified)
        }))
      }
    });
  } catch (error) {
    console.error('[GET ISSUE INTELLIGENCE ERROR]:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error retrieving issue intelligence.'
    });
  }
}

/**
 * GET /api/ai/root-causes/:issueId
 * Retrieve root-cause intelligence for an issue
 */
async function getRootCauses(req, res) {
  try {
    const issueId = parseInt(req.params.issueId, 10);
    if (isNaN(issueId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid issue ID.'
      });
    }

    const [issues] = await pool.execute('SELECT * FROM issues WHERE id = ?', [issueId]);
    if (issues.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Issue #${issueId} not found.`
      });
    }

    const issue = issues[0];
    const issuePortal = (issue.portal || 'education').toLowerCase();

    // Authorization
    if (req.user.role === 'student' || req.user.role === 'faculty') {
      return res.status(403).json({
        success: false,
        message: `Forbidden: ${req.user.role === 'faculty' ? 'Faculty members' : 'Students'} cannot access root-cause intelligence.`
      });
    }

    if (req.user.role === 'bus_incharge') {
      if (issuePortal !== 'bus' || (issue.bus_number && issue.bus_number !== req.user.bus_number)) {
        return res.status(403).json({
          success: false,
          message: `Forbidden: You are assigned to "${req.user.bus_number}" and cannot access this issue.`
        });
      }
    } else if (req.user.role === 'transport_incharge') {
      if (issuePortal !== 'bus') {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Transport Incharge can only access Bus portal issues.'
        });
      }
    } else if (req.user.role === 'hostel_warden') {
      if (issuePortal !== 'hostel' || (issue.floor && issue.floor !== req.user.assigned_floor)) {
        return res.status(403).json({
          success: false,
          message: `Forbidden: You are assigned to "${req.user.assigned_floor}" and cannot access this issue.`
        });
      }
    } else if (req.user.role === 'hod') {
      if (issuePortal !== 'education' || !issue.department || issue.department.toLowerCase() !== (req.user.department || '').toLowerCase()) {
        return res.status(403).json({
          success: false,
          message: `Forbidden: HOD of "${req.user.department}" cannot access root causes for "${issue.department || issuePortal}".`
        });
      }
    }

    const [causes] = await pool.execute(
      'SELECT * FROM possible_causes WHERE issue_id = ? ORDER BY confidence DESC',
      [issueId]
    );

    return res.status(200).json({
      success: true,
      data: {
        issueId: issue.id,
        issueTitle: issue.title,
        department: issue.department,
        possibleContributingFactors: causes.map(c => ({
          id: c.id,
          cause: c.cause_text,
          likelihood: c.likelihood,
          confidence: c.confidence,
          evidence: c.evidence,
          supportingFeedbackCount: c.supporting_count,
          verified: Boolean(c.verified)
        }))
      }
    });
  } catch (error) {
    console.error('[GET ROOT CAUSES ERROR]:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error retrieving root causes.'
    });
  }
}

/**
 * GET /api/ai/explain/:issueId
 * AI Explainability: "Why am I seeing this?"
 */
async function getExplainability(req, res) {
  try {
    if (req.user.role === 'student' || req.user.role === 'faculty') {
      return res.status(403).json({
        success: false,
        message: `Forbidden: ${req.user.role === 'faculty' ? 'Faculty members' : 'Students'} cannot access issue explainability.`
      });
    }

    const issueId = parseInt(req.params.issueId, 10);
    if (isNaN(issueId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid issue ID.'
      });
    }

    const result = await aiService.getIssueExplainability(issueId, req.user);
    if (result.status !== 200) {
      return res.status(result.status).json({
        success: false,
        message: result.message
      });
    }

    return res.status(200).json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('[GET EXPLAINABILITY ERROR]:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error retrieving explainability data.'
    });
  }
}

module.exports = {
  triggerFeedbackAnalysis,
  getFeedbackAnalysis,
  getIssueIntelligence,
  getRootCauses,
  getExplainability
};
