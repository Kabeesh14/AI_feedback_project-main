const recommendationService = require('../services/recommendationService');

/**
 * POST /api/recommendations
 * HOD creates a recommendation for an issue in their department
 */
async function createRecommendation(req, res) {
  try {
    const {
      issueId,
      title,
      justification,
      category,
      priority,
      estimatedCost
    } = req.body;

    const recommendation = await recommendationService.createRecommendation({
      issueId,
      title,
      justification,
      category,
      priority,
      estimatedCost,
      user: req.user
    });

    return res.status(201).json({
      success: true,
      message: 'Recommendation submitted successfully.',
      data: recommendation
    });
  } catch (error) {
    const status = error.statusCode || 500;
    if (status >= 500) {
      console.error('[RECOMMENDATION CONTROLLER - createRecommendation]:', error);
    }
    return res.status(status).json({
      success: false,
      message: error.message || 'Internal server error submitting recommendation.'
    });
  }
}

/**
 * GET /api/recommendations
 * List recommendations with role-based and department isolation
 */
async function getRecommendations(req, res) {
  try {
    const { department, status, priority, page, limit } = req.query;

    const result = await recommendationService.getRecommendations({
      user: req.user,
      department,
      status,
      priority,
      page,
      limit
    });

    return res.status(200).json({
      success: true,
      data: result.recommendations,
      stats: result.stats,
      pagination: result.pagination
    });
  } catch (error) {
    const status = error.statusCode || 500;
    if (status >= 500) {
      console.error('[RECOMMENDATION CONTROLLER - getRecommendations]:', error);
    }
    return res.status(status).json({
      success: false,
      message: error.message || 'Internal server error retrieving recommendations.'
    });
  }
}

/**
 * GET /api/recommendations/:id
 * Retrieve a specific recommendation with audit trail
 */
async function getRecommendationById(req, res) {
  try {
    const recommendation = await recommendationService.getRecommendationById({
      id: req.params.id,
      user: req.user
    });

    return res.status(200).json({
      success: true,
      data: recommendation
    });
  } catch (error) {
    const status = error.statusCode || 500;
    if (status >= 500) {
      console.error('[RECOMMENDATION CONTROLLER - getRecommendationById]:', error);
    }
    return res.status(status).json({
      success: false,
      message: error.message || 'Internal server error retrieving recommendation.'
    });
  }
}

/**
 * PUT /api/recommendations/:id/review
 * Management reviews recommendation (approve, reject, defer)
 */
async function reviewRecommendation(req, res) {
  try {
    const {
      decision,
      reviewNotes,
      assignedTo,
      targetCompletionDate,
      createAction
    } = req.body;

    const result = await recommendationService.reviewRecommendation({
      id: req.params.id,
      decision,
      reviewNotes,
      assignedTo,
      targetCompletionDate,
      createAction: Boolean(createAction),
      user: req.user
    });

    return res.status(200).json({
      success: true,
      message: `Recommendation ${decision} successfully.`,
      data: result.recommendation,
      action: result.action
    });
  } catch (error) {
    const status = error.statusCode || 500;
    if (status >= 500) {
      console.error('[RECOMMENDATION CONTROLLER - reviewRecommendation]:', error);
    }
    return res.status(status).json({
      success: false,
      message: error.message || 'Internal server error reviewing recommendation.'
    });
  }
}

/**
 * POST /api/recommendations/:id/create-action
 * Management converts an approved recommendation into an institution action
 */
async function convertToAction(req, res) {
  try {
    const result = await recommendationService.convertApprovedToAction({
      id: req.params.id,
      actionData: req.body,
      user: req.user
    });

    return res.status(201).json({
      success: true,
      message: 'Institution action created successfully from recommendation.',
      data: result.action,
      recommendation: result.recommendation
    });
  } catch (error) {
    const status = error.statusCode || 500;
    if (status >= 500) {
      console.error('[RECOMMENDATION CONTROLLER - convertToAction]:', error);
    }
    return res.status(status).json({
      success: false,
      message: error.message || 'Internal server error converting recommendation to action.'
    });
  }
}

module.exports = {
  createRecommendation,
  getRecommendations,
  getRecommendationById,
  reviewRecommendation,
  convertToAction
};
