const { pool } = require('../config/db');
const { processFeedbackAI } = require('./aiService');

const OFFICIAL_DEPARTMENTS = [
  'Information Technology',
  'Computer Science and Business System',
  'Biotechnology Engineering',
  'Biomedical Engineering',
  'Artificial Intelligence & Data Science',
  'Computer Science & Engineering',
  'Electronics & Communication Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Computer Communication Engineering',
  'Chemical Engineering',
  'Electrical and Electronics Engineering',
  'Artificial Intelligence and Machine Learning'
];

const SUPPORTED_CATEGORIES = [
  'Teaching',
  'Laboratory',
  'Infrastructure',
  'Internet',
  'Hostel',
  'Canteen',
  'Transport',
  'Placement',
  'Library',
  'Other',
  // Bus Portal categories
  'Punctuality & Timing',
  'Driver & Safety',
  'Bus Condition & Cleanliness',
  'Seating & Overcrowding',
  'Route & Stops',
  // Hostel Portal categories
  'Room Maintenance',
  'Restrooms & Hygiene',
  'Water Supply',
  'Electricity & Power',
  'Mess & Food',
  'Security & Safety',
  'Internet & Wi-Fi'
];

const SUPPORTED_STATUSES = [
  'submitted',
  'under_review',
  'action_taken',
  'resolved',
  'closed',
  'action_planned',
  'in_progress',
  'received'
];

/**
 * Format feedback record to be compatible with frontend types
 */
function formatFeedbackRecord(row, requestingUser) {
  const isAnon = Boolean(row.is_anonymous);
  const isOwner = requestingUser && (requestingUser.role === 'student' || requestingUser.role === 'faculty') && requestingUser.id === row.user_id;

  const submitterRole = row.submitter_role || (requestingUser?.id === row.user_id ? requestingUser.role : 'student');
  const roleLabel = submitterRole === 'faculty' ? 'Faculty' : 'Student';
  const nameFallback = submitterRole === 'faculty' ? (row.student_name || 'Faculty Member') : (row.student_name || 'Student');
  const idPrefix = submitterRole === 'faculty' ? 'FAC' : 'STU';

  // Mask identity if anonymous unless viewed by the authoring user
  const studentName = (isAnon && !isOwner) ? `Anonymous ${roleLabel}` : nameFallback;
  const studentId = (isAnon && !isOwner) ? 'ANONYMOUS' : (row.user_id ? `${idPrefix}-${row.user_id}` : `${idPrefix}-000`);

  return {
    id: String(row.id),
    feedbackCode: row.feedback_code,
    userId: (isAnon && !isOwner) ? null : row.user_id,
    studentId,
    studentName,
    submitterRole,
    portal: row.portal || 'education',
    department: row.department,
    bus_number: row.bus_number || null,
    busNumber: row.bus_number || null,
    floor: row.floor || null,
    category: row.category,
    subCategory: row.sub_category || null,
    customSubCategory: row.custom_sub_category || null,
    comment: row.comment,
    feedbackText: row.comment, // Alias for compatibility
    rating: row.rating,
    sentiment: row.sentiment,
    urgency: row.urgency,
    priority: row.priority || row.urgency || 'medium',
    severity: (row.priority || row.urgency || 'medium').toLowerCase(),
    theme: row.theme || 'General Feedback',
    issue: row.issue || row.theme || 'General Feedback',
    status: row.status,
    statusNotes: row.status_notes || null,
    assignedTo: row.assigned_to || null,
    location: row.location || null,
    campusArea: row.campus_area || null,
    anonymous: isAnon,
    isAnonymous: isAnon,
    semester: row.semester || null,
    academicYear: row.academic_year || null,
    year: row.academic_year || '3rd Year',
    imageUrl: row.image_url || null,
    image_url: row.image_url || null,
    date: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * Create a new feedback record
 */
async function createFeedback({
  userId,
  userName,
  userRole = 'student',
  userPortal = 'education',
  userDepartment = null,
  busNumber = null,
  floor = null,
  feedbackText,
  rating,
  category,
  anonymous = false,
  semester = null,
  academicYear = null,
  location = null,
  campusArea = null,
  equipmentId = null,
  imageUrl = null,
  image_url = null
}) {
  const finalImageUrl = imageUrl || image_url || null;
  const feedbackCode = `FB-${Date.now().toString(36).toUpperCase()}`;
  const isAnon = anonymous ? 1 : 0;
  const initialStatus = 'submitted';
  const portalVal = (userPortal || 'education').toLowerCase();

  // Basic sentiment estimation from rating
  let sentiment = 'neutral';
  if (rating >= 4) sentiment = 'positive';
  else if (rating <= 2) sentiment = 'negative';

  const [result] = await pool.execute(
    `INSERT INTO feedback (
      feedback_code, user_id, student_name, portal, department, bus_number, floor, category, 
      rating, comment, is_anonymous, semester, academic_year, 
      sentiment, location, campus_area, equipment_id, status, image_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      feedbackCode,
      userId,
      userName,
      portalVal,
      portalVal === 'education' ? userDepartment : null,
      portalVal === 'bus' ? busNumber : null,
      portalVal === 'hostel' ? floor : null,
      category,
      rating,
      feedbackText.trim(),
      isAnon,
      semester,
      academicYear,
      sentiment,
      location,
      campusArea,
      equipmentId,
      initialStatus,
      finalImageUrl
    ]
  );

  const insertedId = result.insertId;

  // Asynchronous non-blocking AI hook (Phase 4 preparation)
  processFeedbackAI(insertedId, feedbackText, category).catch(() => {});

  // Return created feedback with joined submitter role
  const [rows] = await pool.query(
    'SELECT f.*, u.role AS submitter_role FROM feedback f LEFT JOIN users u ON f.user_id = u.id WHERE f.id = ?',
    [insertedId]
  );
  return formatFeedbackRecord(rows[0], { id: userId, role: userRole });
}

/**
 * Retrieve feedback list with role-based and department-based isolation, filters & pagination
 */
async function getFeedbackList({
  user,
  portal = null,
  bus_number = null,
  floor = null,
  department = null,
  category = null,
  sentiment = null,
  priority = null,
  status = null,
  fromDate = null,
  toDate = null,
  search = null,
  source = null,
  isSelfQuery = false,
  page = 1,
  limit = 20
}) {
  const conditions = [];
  const params = [];

  // Normalize source filter if provided
  const normSource = (source || '').toLowerCase().trim();

  // 1. Role-based and portal-based isolation constraints
  if (isSelfQuery || user.role === 'student') {
    conditions.push('f.user_id = ?');
    params.push(user.id);
    if (portal) {
      conditions.push('f.portal = ?');
      params.push(portal.toLowerCase());
    } else if (user.portal) {
      conditions.push('f.portal = ?');
      params.push(user.portal.toLowerCase());
    }
  } else if (user.role === 'bus_incharge') {
    conditions.push("f.portal = 'bus'");
    conditions.push('f.bus_number = ?');
    params.push(user.bus_number);
  } else if (user.role === 'transport_incharge') {
    conditions.push("f.portal = 'bus'");
    if (bus_number) {
      conditions.push('f.bus_number = ?');
      params.push(bus_number);
    }
  } else if (user.role === 'hostel_warden') {
    conditions.push("f.portal = 'hostel'");
    conditions.push('f.floor = ?');
    params.push(user.assigned_floor);
  } else if (user.role === 'faculty') {
    conditions.push("f.portal = 'education'");
    conditions.push('LOWER(f.department) = LOWER(?)');
    params.push(user.department);
    conditions.push('(u.role = \'student\' OR (f.user_id IS NULL AND u.role IS NULL))');
  } else if (user.role === 'hod') {
    conditions.push("f.portal = 'education'");
    conditions.push('LOWER(f.department) = LOWER(?)');
    params.push(user.department);

    if (normSource === 'student') {
      conditions.push('(u.role = \'student\' OR (f.user_id IS NULL AND u.role IS NULL))');
    } else if (normSource === 'faculty') {
      conditions.push('u.role = \'faculty\'');
    }
  } else if (user.role === 'management') {
    if (portal) {
      conditions.push('f.portal = ?');
      params.push(portal.toLowerCase());
      if (portal.toLowerCase() === 'bus' && bus_number) {
        conditions.push('f.bus_number = ?');
        params.push(bus_number);
      } else if (portal.toLowerCase() === 'hostel' && floor) {
        conditions.push('f.floor = ?');
        params.push(floor);
      } else if (portal.toLowerCase() === 'education' && department && department.trim() && department.toLowerCase() !== 'all') {
        conditions.push('LOWER(f.department) = LOWER(?)');
        params.push(department.trim());
      }
    } else if (department && department.trim() && department.toLowerCase() !== 'all') {
      conditions.push('LOWER(f.department) = LOWER(?)');
      params.push(department.trim());
    }

    if (normSource === 'student') {
      conditions.push('(u.role = \'student\' OR (f.user_id IS NULL AND u.role IS NULL))');
    } else if (normSource === 'faculty') {
      conditions.push('u.role = \'faculty\'');
    }
  }

  // 2. Filters
  if (category) {
    conditions.push('f.category = ?');
    params.push(category);
  }

  if (sentiment) {
    conditions.push('f.sentiment = ?');
    params.push(sentiment);
  }

  if (priority) {
    conditions.push('(f.priority = ? OR f.urgency = ?)');
    params.push(priority, priority);
  }

  if (status) {
    conditions.push('f.status = ?');
    params.push(status);
  }

  if (fromDate) {
    conditions.push('f.created_at >= ?');
    params.push(fromDate);
  }

  if (toDate) {
    conditions.push('f.created_at <= ?');
    params.push(toDate);
  }

  if (search) {
    conditions.push('(f.comment LIKE ? OR f.category LIKE ? OR f.theme LIKE ?)');
    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // 3. Count total matching records
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM feedback f LEFT JOIN users u ON f.user_id = u.id ${whereClause}`,
    params
  );
  const total = countRows[0].total;

  // 4. Pagination
  const validPage = Math.max(1, parseInt(page, 10) || 1);
  const validLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (validPage - 1) * validLimit;
  const totalPages = Math.ceil(total / validLimit) || 1;

  // 5. Query records
  const queryParams = [...params, validLimit, offset];
  const [rows] = await pool.query(
    `SELECT f.*, u.role AS submitter_role FROM feedback f LEFT JOIN users u ON f.user_id = u.id ${whereClause} ORDER BY f.created_at DESC LIMIT ? OFFSET ?`,
    queryParams
  );

  const formattedData = rows.map((r) => formatFeedbackRecord(r, user));

  return {
    feedback: formattedData,
    pagination: {
      page: validPage,
      limit: validLimit,
      total,
      totalPages
    }
  };
}

/**
 * Retrieve single feedback by ID with authorization verification
 */
async function getFeedbackById({ id, user }) {
  const [rows] = await pool.query(
    'SELECT f.*, u.role AS submitter_role FROM feedback f LEFT JOIN users u ON f.user_id = u.id WHERE f.id = ?',
    [id]
  );
  if (rows.length === 0) {
    return { status: 404, message: `Feedback with ID #${id} not found.` };
  }

  const record = rows[0];

  // Authorization check
  if (user.role === 'student') {
    if (record.user_id !== user.id) {
      return { status: 403, message: 'Forbidden: You can only view your own feedback records.' };
    }
  } else if (user.role === 'faculty') {
    // Faculty can view their own feedback, or student feedback from their department
    if (record.user_id === user.id) {
      // Own feedback - allow
    } else if (record.department.toLowerCase() !== user.department.toLowerCase()) {
      return {
        status: 403,
        message: `Forbidden: Faculty of "${user.department}" cannot access feedback from "${record.department}".`
      };
    } else if (record.submitter_role === 'faculty') {
      return {
        status: 403,
        message: 'Forbidden: Faculty cannot access feedback submitted by other faculty members.'
      };
    }
  } else if (user.role === 'hod') {
    if (record.department.toLowerCase() !== user.department.toLowerCase()) {
      return {
        status: 403,
        message: `Forbidden: HOD of "${user.department}" cannot access feedback from "${record.department}".`
      };
    }
  }

  return { status: 200, data: formatFeedbackRecord(record, user) };
}

/**
 * Update feedback status & notes (HOD or Management only)
 */
async function updateFeedback({ id, user, status, statusNotes, assignedTo }) {
  const [rows] = await pool.execute('SELECT * FROM feedback WHERE id = ?', [id]);
  if (rows.length === 0) {
    return { status: 404, message: `Feedback with ID #${id} not found.` };
  }

  const record = rows[0];

  // Authorization check
  if (user.role === 'student' || user.role === 'faculty') {
    return { status: 403, message: 'Forbidden: Students and faculty cannot modify feedback status.' };
  }

  if (user.role === 'hod') {
    if (record.department.toLowerCase() !== user.department.toLowerCase()) {
      return {
        status: 403,
        message: `Forbidden: HOD of "${user.department}" cannot update feedback from "${record.department}".`
      };
    }
  }

  const updates = [];
  const params = [];

  if (status) {
    updates.push('status = ?');
    params.push(status);
  }

  if (statusNotes !== undefined) {
    updates.push('status_notes = ?');
    params.push(statusNotes);
  }

  if (assignedTo !== undefined) {
    updates.push('assigned_to = ?');
    params.push(assignedTo);
  }

  if (updates.length > 0) {
    params.push(id);
    await pool.execute(`UPDATE feedback SET ${updates.join(', ')} WHERE id = ?`, params);
  }

  const [updatedRows] = await pool.execute('SELECT * FROM feedback WHERE id = ?', [id]);
  return { status: 200, data: formatFeedbackRecord(updatedRows[0], user) };
}

/**
 * Delete feedback record
 */
async function deleteFeedback({ id, user }) {
  const [rows] = await pool.execute('SELECT * FROM feedback WHERE id = ?', [id]);
  if (rows.length === 0) {
    return { status: 404, message: `Feedback with ID #${id} not found.` };
  }

  const record = rows[0];

  // Authorization check
  if (user.role === 'student' || user.role === 'faculty') {
    if (record.user_id !== user.id) {
      return { status: 403, message: `Forbidden: ${user.role === 'faculty' ? 'Faculty' : 'Students'} cannot delete another user's feedback.` };
    }
    if (record.status !== 'submitted' && record.status !== 'received') {
      return { status: 403, message: 'Forbidden: Cannot delete feedback that is already under review or resolved.' };
    }
  } else if (user.role === 'hod') {
    if (record.department.toLowerCase() !== user.department.toLowerCase()) {
      return {
        status: 403,
        message: `Forbidden: HOD of "${user.department}" cannot delete feedback from "${record.department}".`
      };
    }
  }

  await pool.execute('DELETE FROM feedback WHERE id = ?', [id]);
  return { status: 200, message: `Feedback #${id} deleted successfully.` };
}

module.exports = {
  OFFICIAL_DEPARTMENTS,
  SUPPORTED_CATEGORIES,
  SUPPORTED_STATUSES,
  createFeedback,
  getFeedbackList,
  getFeedbackById,
  updateFeedback,
  deleteFeedback
};
