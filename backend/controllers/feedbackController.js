const feedbackService = require('../services/feedbackService');
const firebaseStorageService = require('../services/firebaseStorageService');
const { pool } = require('../config/db');

/**
 * POST /api/feedback
 * Submit a new feedback with optional attached image
 */
async function createFeedback(req, res) {
  try {
    const user = req.user;
    const {
      feedbackText,
      comment,
      rating,
      category,
      anonymous = false,
      semester = null,
      academicYear = null,
      location = null,
      campusArea = null,
      equipmentId = null,
      department: requestedDept,
      imageUrl = null,
      image_url = null
    } = req.body;

    const rawText = feedbackText || comment;

    // 0. Validate image if uploaded via multipart/form-data
    if (req.file) {
      const fileValidation = firebaseStorageService.validateImageFile(req.file);
      if (!fileValidation.valid) {
        return res.status(400).json({
          success: false,
          message: fileValidation.error
        });
      }
    }

    // 1. Validate feedbackText
    if (!rawText || typeof rawText !== 'string' || rawText.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Feedback text is required and must be at least 5 characters.'
      });
    }

    if (rawText.length > 5000) {
      return res.status(400).json({
        success: false,
        message: 'Feedback text cannot exceed 5,000 characters.'
      });
    }

    // 2. Validate rating
    const parsedRating = parseInt(rating, 10);
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be an integer between 1 and 5.'
      });
    }

    // 3. Validate category
    if (!category || !feedbackService.SUPPORTED_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Invalid category. Must be one of: ${feedbackService.SUPPORTED_CATEGORIES.join(', ')}.`
      });
    }

    // 4. Portal-specific resolution & department assignment
    const userPortal = (user.portal || 'education').toLowerCase();
    let assignedDepartment = null;
    let busNumber = null;
    let floor = null;

    if (userPortal === 'education') {
      if (user.role === 'student' || user.role === 'faculty') {
        if (requestedDept && requestedDept.trim().toLowerCase() !== user.department.toLowerCase()) {
          return res.status(400).json({
            success: false,
            message: `Forbidden: You can only submit feedback for your assigned department ("${user.department}").`
          });
        }
      }

      assignedDepartment = user.department;
      if (!assignedDepartment && user.role !== 'management') {
        return res.status(400).json({
          success: false,
          message: 'User does not have an assigned department.'
        });
      }
    } else if (userPortal === 'bus') {
      busNumber = user.bus_number || req.body.bus_number || null;
      if (user.role === 'student' && !busNumber) {
        return res.status(400).json({
          success: false,
          message: 'Student does not have an assigned bus number.'
        });
      }
      assignedDepartment = null;
    } else if (userPortal === 'hostel') {
      floor = user.floor || req.body.floor || null;
      if (user.role === 'student' && !floor) {
        return res.status(400).json({
          success: false,
          message: 'Student does not have an assigned floor.'
        });
      }
      assignedDepartment = null;
    }

    // Initial image reference (null if direct multipart file to be uploaded after record creation)
    const initialImageUrl = req.file ? null : (imageUrl || image_url || null);

    const newFeedback = await feedbackService.createFeedback({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      userPortal,
      userDepartment: assignedDepartment,
      busNumber,
      floor,
      feedbackText: rawText,
      rating: parsedRating,
      category,
      anonymous: Boolean(anonymous),
      semester,
      academicYear,
      location,
      campusArea,
      equipmentId,
      imageUrl: initialImageUrl
    });

    // If a direct file was attached via multipart, upload to storage with created feedback ID
    if (req.file) {
      try {
        const uploadResult = await firebaseStorageService.uploadFeedbackImage({
          buffer: req.file.buffer,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          portal: userPortal,
          feedbackId: newFeedback.id,
          userId: user.id
        });

        // Update record with image reference
        await pool.execute('UPDATE feedback SET image_url = ? WHERE id = ?', [
          uploadResult.url,
          newFeedback.id
        ]);
        newFeedback.imageUrl = uploadResult.url;
        newFeedback.image_url = uploadResult.url;
      } catch (uploadError) {
        console.error('[Feedback Image Storage Upload Error]:', uploadError);
        // Avoid partial/inconsistent record: rollback newly created feedback record (Section 15)
        await pool.execute('DELETE FROM feedback WHERE id = ?', [newFeedback.id]);
        const statusCode = uploadError.statusCode || 500;
        return res.status(statusCode).json({
          success: false,
          message: `Failed to upload attached image to storage: ${uploadError.message}. Feedback submission was rolled back.`
        });
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully.',
      data: newFeedback
    });
  } catch (error) {
    console.error('[CREATE FEEDBACK ERROR]:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error submitting feedback.'
    });
  }
}


/**
 * GET /api/feedback
 * Retrieve feedback list with role and department isolation
 */
async function getAllFeedback(req, res) {
  try {
    const user = req.user;
    const {
      portal: requestedPortal,
      bus_number: requestedBus,
      floor: requestedFloor,
      department,
      category,
      sentiment,
      priority,
      status,
      fromDate,
      toDate,
      search,
      source,
      page = 1,
      limit = 20
    } = req.query;

    // Security scope enforcement
    let effectivePortal = requestedPortal ? requestedPortal.toLowerCase() : (user.portal || 'education').toLowerCase();
    let effectiveBus = null;
    let effectiveFloor = null;

    if (user.role === 'bus_incharge') {
      effectivePortal = 'bus';
      effectiveBus = user.bus_number;
      if (requestedBus && requestedBus.trim().toLowerCase() !== user.bus_number.trim().toLowerCase()) {
        return res.status(403).json({
          success: false,
          message: `Forbidden: You are assigned to "${user.bus_number}" and cannot access "${requestedBus}".`
        });
      }
    } else if (user.role === 'transport_incharge') {
      effectivePortal = 'bus';
      effectiveBus = requestedBus || null;
    } else if (user.role === 'hostel_warden') {
      effectivePortal = 'hostel';
      effectiveFloor = user.assigned_floor;
      if (requestedFloor && requestedFloor.trim().toLowerCase() !== user.assigned_floor.trim().toLowerCase()) {
        return res.status(403).json({
          success: false,
          message: `Forbidden: You are assigned to "${user.assigned_floor}" and cannot access "${requestedFloor}".`
        });
      }
    } else if (user.role === 'faculty') {
      effectivePortal = 'education';
      if (department && department.trim().toLowerCase() !== user.department.toLowerCase()) {
        return res.status(403).json({
          success: false,
          message: `Forbidden: Faculty of "${user.department}" cannot view feedback from "${department}".`
        });
      }
    } else if (user.role === 'hod') {
      effectivePortal = 'education';
      if (department && department.trim().toLowerCase() !== user.department.toLowerCase()) {
        return res.status(403).json({
          success: false,
          message: `Forbidden: HOD of "${user.department}" cannot view feedback from "${department}".`
        });
      }
    } else if (user.role === 'management') {
      effectivePortal = requestedPortal ? requestedPortal.toLowerCase() : null;
      effectiveBus = requestedBus || null;
      effectiveFloor = requestedFloor || null;
      if (department && department !== 'ALL' && department !== 'all') {
        const match = feedbackService.OFFICIAL_DEPARTMENTS.find(
          (d) => d.toLowerCase() === department.trim().toLowerCase()
        );
        if (!match) {
          return res.status(400).json({
            success: false,
            message: `Invalid department filter. Must be one of the official departments: ${feedbackService.OFFICIAL_DEPARTMENTS.join(', ')}.`
          });
        }
      }
    }

    const result = await feedbackService.getFeedbackList({
      user,
      portal: effectivePortal,
      bus_number: effectiveBus,
      floor: effectiveFloor,
      department: department || null,
      category: category || null,
      sentiment: sentiment || null,
      priority: priority || null,
      status: status || null,
      fromDate: fromDate || null,
      toDate: toDate || null,
      search: search || null,
      source: source || null,
      page,
      limit
    });

    return res.status(200).json({
      success: true,
      data: result.feedback,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('[GET ALL FEEDBACK ERROR]:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error retrieving feedback.'
    });
  }
}

/**
 * GET /api/feedback/my
 * Dedicated endpoint for users to view their own feedback history
 */
async function getMyFeedback(req, res) {
  try {
    const user = req.user;
    const { portal, category, sentiment, status, page = 1, limit = 20 } = req.query;

    const result = await feedbackService.getFeedbackList({
      user,
      portal: portal || user.portal || 'education',
      isSelfQuery: true,
      category: category || null,
      sentiment: sentiment || null,
      status: status || null,
      page,
      limit
    });

    return res.status(200).json({
      success: true,
      data: result.feedback,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('[GET MY FEEDBACK ERROR]:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error retrieving your feedback.'
    });
  }
}

/**
 * GET /api/feedback/department/:department
 * Department feedback endpoint with strict role authorization
 */
async function getDepartmentFeedback(req, res) {
  try {
    const user = req.user;
    const targetDept = req.params.department;

    if (!targetDept) {
      return res.status(400).json({
        success: false,
        message: 'Department name is required in URL.'
      });
    }

    // 1. Students are strictly forbidden from department-wide access
    if (user.role === 'student') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Students cannot access department administrative feedback.'
      });
    }

    // 2. Faculty is strictly restricted to their own department (and only sees student feedback)
    if (user.role === 'faculty') {
      if (targetDept.trim().toLowerCase() !== user.department.toLowerCase()) {
        return res.status(403).json({
          success: false,
          message: `Forbidden: Faculty of "${user.department}" cannot access feedback from "${targetDept}".`
        });
      }
    }

    // 3. HOD is strictly restricted to their own department
    if (user.role === 'hod') {
      if (targetDept.trim().toLowerCase() !== user.department.toLowerCase()) {
        return res.status(403).json({
          success: false,
          message: `Forbidden: HOD of "${user.department}" cannot access feedback from "${targetDept}".`
        });
      }
    }

    // 4. Management can view any official department
    if (user.role === 'management') {
      const match = feedbackService.OFFICIAL_DEPARTMENTS.find(
        (d) => d.toLowerCase() === targetDept.trim().toLowerCase()
      );
      if (!match) {
        return res.status(400).json({
          success: false,
          message: `Invalid department. Must be one of: ${feedbackService.OFFICIAL_DEPARTMENTS.join(', ')}.`
        });
      }
    }

    const { category, sentiment, priority, status, fromDate, toDate, search, source, page = 1, limit = 20 } = req.query;

    const result = await feedbackService.getFeedbackList({
      user,
      department: targetDept,
      category: category || null,
      sentiment: sentiment || null,
      priority: priority || null,
      status: status || null,
      fromDate: fromDate || null,
      toDate: toDate || null,
      search: search || null,
      source: source || null,
      page,
      limit
    });

    return res.status(200).json({
      success: true,
      data: result.feedback,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('[GET DEPT FEEDBACK ERROR]:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error retrieving department feedback.'
    });
  }
}

/**
 * GET /api/feedback/:id
 * Retrieve a specific feedback record
 */
async function getFeedbackById(req, res) {
  try {
    const feedbackId = parseInt(req.params.id, 10);
    if (isNaN(feedbackId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid feedback ID.'
      });
    }

    const result = await feedbackService.getFeedbackById({
      id: feedbackId,
      user: req.user
    });

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
    console.error('[GET FEEDBACK BY ID ERROR]:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error retrieving feedback record.'
    });
  }
}

/**
 * PUT /api/feedback/:id
 * Update feedback status & notes (HOD or Management)
 */
async function updateFeedback(req, res) {
  try {
    const feedbackId = parseInt(req.params.id, 10);
    if (isNaN(feedbackId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid feedback ID.'
      });
    }

    const { status, statusNotes, assignedTo } = req.body;

    if (status && !feedbackService.SUPPORTED_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${feedbackService.SUPPORTED_STATUSES.join(', ')}.`
      });
    }

    const result = await feedbackService.updateFeedback({
      id: feedbackId,
      user: req.user,
      status,
      statusNotes,
      assignedTo
    });

    if (result.status !== 200) {
      return res.status(result.status).json({
        success: false,
        message: result.message
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Feedback updated successfully.',
      data: result.data
    });
  } catch (error) {
    console.error('[UPDATE FEEDBACK ERROR]:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error updating feedback.'
    });
  }
}

/**
 * DELETE /api/feedback/:id
 * Delete a feedback record
 */
async function deleteFeedback(req, res) {
  try {
    const feedbackId = parseInt(req.params.id, 10);
    if (isNaN(feedbackId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid feedback ID.'
      });
    }

    const result = await feedbackService.deleteFeedback({
      id: feedbackId,
      user: req.user
    });

    if (result.status !== 200) {
      return res.status(result.status).json({
        success: false,
        message: result.message
      });
    }

    return res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('[DELETE FEEDBACK ERROR]:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error deleting feedback.'
    });
  }
}

/**
 * GET /api/feedback/:id/image
 * Secure image retrieval route verifying caller authorization (Section 9 & 10)
 */
async function getFeedbackImage(req, res) {
  try {
    const feedbackId = parseInt(req.params.id, 10);
    if (isNaN(feedbackId)) {
      return res.status(400).json({ success: false, message: 'Invalid feedback ID.' });
    }

    const [rows] = await pool.query('SELECT * FROM feedback WHERE id = ?', [feedbackId]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Feedback record not found.' });
    }

    const feedbackRecord = rows[0];
    if (!feedbackRecord.image_url) {
      return res.status(404).json({ success: false, message: 'No image attached to this feedback.' });
    }

    const accessCheck = firebaseStorageService.verifyImageAccess(feedbackRecord, req.user);
    if (!accessCheck.authorized) {
      return res.status(403).json({
        success: false,
        message: accessCheck.reason || 'Forbidden: You are not authorized to view this image.'
      });
    }

    if (feedbackRecord.image_url.startsWith('http://') || feedbackRecord.image_url.startsWith('https://')) {
      if (req.query.redirect === 'true') {
        return res.redirect(feedbackRecord.image_url);
      }
      return res.status(200).json({
        success: true,
        data: { url: feedbackRecord.image_url }
      });
    }

    const localUrl = feedbackRecord.image_url.startsWith('/')
      ? feedbackRecord.image_url
      : `/uploads/${feedbackRecord.image_url}`;

    if (req.query.redirect === 'true') {
      return res.redirect(localUrl);
    }

    return res.status(200).json({
      success: true,
      data: { url: localUrl }
    });
  } catch (err) {
    console.error('[GET FEEDBACK IMAGE ERROR]:', err);
    return res.status(500).json({ success: false, message: 'Internal server error retrieving feedback image.' });
  }
}

module.exports = {
  createFeedback,
  getAllFeedback,
  getMyFeedback,
  getDepartmentFeedback,
  getFeedbackById,
  getFeedbackImage,
  updateFeedback,
  deleteFeedback
};

