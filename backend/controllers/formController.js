const formService = require('../services/formService');

/**
 * Helper to ensure user is an authorized form manager
 */
function requireHodRole(req, res) {
  const allowed = ['hod', 'bus_incharge', 'transport_incharge', 'hostel_warden', 'management'];
  if (!allowed.includes(req.user.role)) {
    res.status(403).json({
      success: false,
      message: `Forbidden: Only authorized institutional managers can manage feedback forms.`
    });
    return false;
  }
  return true;
}

/**
 * POST /api/forms
 * Authorized manager creates a new draft form
 */
async function createForm(req, res) {
  try {
    if (!requireHodRole(req, res)) return;

    const {
      title,
      description,
      target_audience,
      targetAudience,
      target_academic_year,
      targetAcademicYear,
      target_semester,
      targetSemester,
      questions
    } = req.body;

    const form = await formService.createForm({
      title,
      description,
      targetAudience: target_audience ?? targetAudience,
      targetAcademicYear: target_academic_year ?? targetAcademicYear,
      targetSemester: target_semester ?? targetSemester,
      questions,
      user: req.user
    });

    return res.status(201).json({
      success: true,
      message: 'Feedback form created successfully as draft.',
      data: form
    });
  } catch (error) {
    console.error('[FORM CONTROLLER ERROR - createForm]:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to create feedback form.'
    });
  }
}

/**
 * GET /api/forms
 * Role-aware form listing
 */
async function getForms(req, res) {
  try {
    const { status, department, targetAudience, target_audience, audience, page, limit, portal, bus_number, floor } = req.query;

    const result = await formService.getForms({
      user: req.user,
      status,
      department,
      portal: portal || req.user.portal,
      bus_number: req.user.role === 'bus_incharge' ? req.user.bus_number : bus_number,
      floor: req.user.role === 'hostel_warden' ? req.user.assigned_floor : floor,
      targetAudience: target_audience || targetAudience || audience,
      page,
      limit
    });

    return res.status(200).json({
      success: true,
      data: result.forms,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('[FORM CONTROLLER ERROR - getForms]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve feedback forms.',
      error: error.message
    });
  }
}

/**
 * GET /api/forms/student
 * Specific helper for student assigned forms
 */
async function getStudentForms(req, res) {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Endpoint is reserved for student role.'
      });
    }

    const result = await formService.getForms({
      user: req.user,
      page: req.query.page,
      limit: req.query.limit
    });

    return res.status(200).json({
      success: true,
      data: result.forms,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('[FORM CONTROLLER ERROR - getStudentForms]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve student feedback forms.'
    });
  }
}

/**
 * GET /api/forms/faculty
 * Specific helper for faculty assigned surveys
 */
async function getFacultyForms(req, res) {
  try {
    if (req.user.role !== 'faculty') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Endpoint is reserved for faculty role.'
      });
    }

    const result = await formService.getFacultyForms({
      user: req.user,
      submittedOnly: req.query.submittedOnly === 'true' || req.query.submittedOnly === true,
      page: req.query.page,
      limit: req.query.limit
    });

    return res.status(200).json({
      success: true,
      data: result.forms,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('[FORM CONTROLLER ERROR - getFacultyForms]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve faculty feedback forms.'
    });
  }
}

/**
 * GET /api/forms/:id
 * Retrieve a single form with its questions
 */
async function getFormById(req, res) {
  try {
    const formId = parseInt(req.params.id, 10);
    if (isNaN(formId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid form ID.'
      });
    }

    const form = await formService.getFormById(formId, req.user);

    if (!form) {
      return res.status(404).json({
        success: false,
        message: `Feedback form #${formId} not found.`
      });
    }

    if (form.forbidden) {
      // For students, preserve privacy by returning 404 if form belongs to another department or is unpublished
      if (req.user.role === 'student') {
        return res.status(404).json({
          success: false,
          message: `Feedback form #${formId} not found.`
        });
      }
      return res.status(403).json({
        success: false,
        message: form.reason || 'Forbidden: You are not authorized to view this form.'
      });
    }

    return res.status(200).json({
      success: true,
      data: form
    });
  } catch (error) {
    console.error('[FORM CONTROLLER ERROR - getFormById]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve feedback form.'
    });
  }
}

/**
 * PUT /api/forms/:id
 * Update draft form details
 */
async function updateForm(req, res) {
  try {
    if (!requireHodRole(req, res)) return;

    const formId = parseInt(req.params.id, 10);
    if (isNaN(formId)) {
      return res.status(400).json({ success: false, message: 'Invalid form ID.' });
    }

    const result = await formService.updateForm(formId, req.body, req.user);

    if (!result) {
      return res.status(404).json({ success: false, message: `Form #${formId} not found.` });
    }
    if (result.forbidden) {
      return res.status(403).json({ success: false, message: result.message });
    }
    if (result.statusConflict) {
      return res.status(400).json({ success: false, message: result.message });
    }

    return res.status(200).json({
      success: true,
      message: 'Form updated successfully.',
      data: result
    });
  } catch (error) {
    console.error('[FORM CONTROLLER ERROR - updateForm]:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to update form.'
    });
  }
}

/**
 * POST /api/forms/:id/questions
 * Add question to draft form
 */
async function addQuestion(req, res) {
  try {
    if (!requireHodRole(req, res)) return;

    const formId = parseInt(req.params.id, 10);
    if (isNaN(formId)) {
      return res.status(400).json({ success: false, message: 'Invalid form ID.' });
    }

    const result = await formService.addQuestion(formId, req.body, req.user);

    if (!result) {
      return res.status(404).json({ success: false, message: `Form #${formId} not found.` });
    }
    if (result.forbidden) {
      return res.status(403).json({ success: false, message: result.message });
    }
    if (result.statusConflict) {
      return res.status(400).json({ success: false, message: result.message });
    }

    return res.status(201).json({
      success: true,
      message: 'Question added successfully.',
      data: result
    });
  } catch (error) {
    console.error('[FORM CONTROLLER ERROR - addQuestion]:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to add question.'
    });
  }
}

/**
 * PUT /api/forms/:id/questions/:questionId
 * Update a question in draft form
 */
async function updateQuestion(req, res) {
  try {
    if (!requireHodRole(req, res)) return;

    const formId = parseInt(req.params.id, 10);
    const questionId = parseInt(req.params.questionId, 10);
    if (isNaN(formId) || isNaN(questionId)) {
      return res.status(400).json({ success: false, message: 'Invalid form or question ID.' });
    }

    const result = await formService.updateQuestion(formId, questionId, req.body, req.user);

    if (!result) {
      return res.status(404).json({ success: false, message: `Form #${formId} not found.` });
    }
    if (result.forbidden) {
      return res.status(403).json({ success: false, message: result.message });
    }
    if (result.statusConflict) {
      return res.status(400).json({ success: false, message: result.message });
    }
    if (result.notFound) {
      return res.status(404).json({ success: false, message: result.message });
    }

    return res.status(200).json({
      success: true,
      message: 'Question updated successfully.',
      data: result
    });
  } catch (error) {
    console.error('[FORM CONTROLLER ERROR - updateQuestion]:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to update question.'
    });
  }
}

/**
 * DELETE /api/forms/:id/questions/:questionId
 * Delete a question from draft form
 */
async function deleteQuestion(req, res) {
  try {
    if (!requireHodRole(req, res)) return;

    const formId = parseInt(req.params.id, 10);
    const questionId = parseInt(req.params.questionId, 10);
    if (isNaN(formId) || isNaN(questionId)) {
      return res.status(400).json({ success: false, message: 'Invalid form or question ID.' });
    }

    const result = await formService.deleteQuestion(formId, questionId, req.user);

    if (!result) {
      return res.status(404).json({ success: false, message: `Form #${formId} not found.` });
    }
    if (result.forbidden) {
      return res.status(403).json({ success: false, message: result.message });
    }
    if (result.statusConflict) {
      return res.status(400).json({ success: false, message: result.message });
    }
    if (result.notFound) {
      return res.status(404).json({ success: false, message: result.message });
    }

    return res.status(200).json({
      success: true,
      message: 'Question deleted successfully.'
    });
  } catch (error) {
    console.error('[FORM CONTROLLER ERROR - deleteQuestion]:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to delete question.'
    });
  }
}

/**
 * POST /api/forms/:id/publish
 * Publish draft form
 */
async function publishForm(req, res) {
  try {
    if (!requireHodRole(req, res)) return;

    const formId = parseInt(req.params.id, 10);
    if (isNaN(formId)) {
      return res.status(400).json({ success: false, message: 'Invalid form ID.' });
    }

    const result = await formService.publishForm(formId, req.user);

    if (!result) {
      return res.status(404).json({ success: false, message: `Form #${formId} not found.` });
    }
    if (result.forbidden) {
      return res.status(403).json({ success: false, message: result.message });
    }
    if (result.statusConflict) {
      return res.status(400).json({ success: false, message: result.message });
    }

    return res.status(200).json({
      success: true,
      message: 'Form published successfully. Students in your department can now respond.',
      data: result
    });
  } catch (error) {
    console.error('[FORM CONTROLLER ERROR - publishForm]:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to publish form.'
    });
  }
}

/**
 * POST /api/forms/:id/close
 * Close published form
 */
async function closeForm(req, res) {
  try {
    if (!requireHodRole(req, res)) return;

    const formId = parseInt(req.params.id, 10);
    if (isNaN(formId)) {
      return res.status(400).json({ success: false, message: 'Invalid form ID.' });
    }

    const result = await formService.closeForm(formId, req.user);

    if (!result) {
      return res.status(404).json({ success: false, message: `Form #${formId} not found.` });
    }
    if (result.forbidden) {
      return res.status(403).json({ success: false, message: result.message });
    }
    if (result.statusConflict) {
      return res.status(400).json({ success: false, message: result.message });
    }

    return res.status(200).json({
      success: true,
      message: 'Form closed successfully. New submissions are now disabled.',
      data: result
    });
  } catch (error) {
    console.error('[FORM CONTROLLER ERROR - closeForm]:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to close form.'
    });
  }
}

/**
 * GET /api/forms/:id/submission-status
 * Student checks if they have already submitted this form
 */
async function getSubmissionStatus(req, res) {
  try {
    if (req.user.role !== 'student' && req.user.role !== 'faculty') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Submission status is only applicable to respondents.'
      });
    }

    const formId = parseInt(req.params.id, 10);
    if (isNaN(formId)) {
      return res.status(400).json({ success: false, message: 'Invalid form ID.' });
    }

    const status = await formService.getSubmissionStatus(formId, req.user.id);

    return res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('[FORM CONTROLLER ERROR - getSubmissionStatus]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve submission status.'
    });
  }
}

/**
 * POST /api/forms/:id/submit
 * Student submits responses to a published form
 */
async function submitFormResponse(req, res) {
  try {
    if (req.user.role !== 'student' && req.user.role !== 'faculty') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only students and faculty members can submit feedback responses.'
      });
    }

    const formId = parseInt(req.params.id, 10);
    if (isNaN(formId)) {
      return res.status(400).json({ success: false, message: 'Invalid form ID.' });
    }

    const { answers, imageUrl, image_url } = req.body;
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        message: 'Missing or invalid answers array in submission body.'
      });
    }

    const result = await formService.submitFormResponse(formId, req.user, answers, imageUrl || image_url || null);

    if (result.errorType === 'NOT_FOUND') {
      return res.status(404).json({ success: false, message: result.message });
    }
    if (result.errorType === 'FORBIDDEN') {
      return res.status(403).json({ success: false, message: result.message });
    }
    if (result.errorType === 'DUPLICATE') {
      return res.status(409).json({ success: false, message: result.message });
    }
    if (result.errorType === 'INVALID_STATUS' || result.errorType === 'BAD_REQUEST') {
      return res.status(400).json({ success: false, message: result.message });
    }

    return res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully.',
      data: result.data
    });
  } catch (error) {
    console.error('[FORM CONTROLLER ERROR - submitFormResponse]:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while saving feedback submission.',
      error: error.message
    });
  }
}

/**
 * GET /api/forms/:id/participation
 * Retrieve participation metrics and respondent tracking for a form
 */
async function getFormParticipation(req, res) {
  try {
    const formId = parseInt(req.params.id, 10);
    if (isNaN(formId)) {
      return res.status(400).json({ success: false, message: 'Invalid form ID.' });
    }

    const result = await formService.getFormParticipation(formId, req.user);

    if (result.notFound) {
      return res.status(404).json({ success: false, message: result.message });
    }
    if (result.forbidden) {
      return res.status(403).json({ success: false, message: result.message });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('[FORM CONTROLLER ERROR - getFormParticipation]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve form participation data.'
    });
  }
}

/**
 * POST /api/forms/:id/analyze
 * Trigger collective AI analysis for a form
 */
async function analyzeForm(req, res) {
  try {
    const formId = parseInt(req.params.id, 10);
    if (isNaN(formId)) {
      return res.status(400).json({ success: false, message: 'Invalid form ID.' });
    }

    const result = await formService.analyzeForm(formId, req.user);

    if (result.notFound) {
      return res.status(404).json({ success: false, message: result.message });
    }
    if (result.forbidden) {
      return res.status(403).json({ success: false, message: result.message });
    }
    if (result.errorType === 'BAD_REQUEST') {
      return res.status(400).json({ success: false, message: result.message });
    }
    if (result.errorType === 'CONFLICT') {
      return res.status(409).json({ success: false, message: result.message });
    }
    if (result.errorType === 'AI_VALIDATION_FAILED' || result.errorType === 'AI_FAILED') {
      return res.status(500).json({ success: false, message: result.message });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('[FORM CONTROLLER ERROR - analyzeForm]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process collective AI analysis.'
    });
  }
}

/**
 * GET /api/forms/:id/analysis
 * Retrieve completed or current collective AI analysis for a form
 */
async function getFormAnalysis(req, res) {
  try {
    const formId = parseInt(req.params.id, 10);
    if (isNaN(formId)) {
      return res.status(400).json({ success: false, message: 'Invalid form ID.' });
    }

    const result = await formService.getFormAnalysis(formId, req.user);

    if (result.notFound) {
      return res.status(404).json({ success: false, message: result.message });
    }
    if (result.forbidden) {
      return res.status(403).json({ success: false, message: result.message });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('[FORM CONTROLLER ERROR - getFormAnalysis]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve form analysis data.'
    });
  }
}

module.exports = {
  createForm,
  getForms,
  getStudentForms,
  getFacultyForms,
  getFormById,
  updateForm,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  publishForm,
  closeForm,
  getSubmissionStatus,
  submitFormResponse,
  getFormParticipation,
  analyzeForm,
  getFormAnalysis
};
