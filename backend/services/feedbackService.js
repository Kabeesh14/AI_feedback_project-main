const { pool } = require('../config/db');
const { processFeedbackAI } = require('./aiService');
const { buildBusNumberSql, isMatchingBus } = require('../utils/busUtils');

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
  // Education Campus Facility categories
  'Classroom',
  'Food / Canteen',
  'Restroom',
  'Furniture / Infrastructure',
  'Computer / IT',
  'Electricity',
  'Other campus facilities',
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

const CAMPUS_SECTOR_CATEGORIES = [
  'Library',
  'Food / Canteen',
  'Canteen',
  'Food',
  'Classroom',
  'Laboratory',
  'Restroom',
  'Furniture / Infrastructure',
  'Infrastructure',
  'Computer / IT',
  'Internet',
  'Electricity',
  'Other campus facilities',
  'Other'
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
  } else if (user.role === 'bus_incharge' || user.role === 'transport_incharge') {
    conditions.push("f.portal = 'bus'");
    if (bus_number && String(bus_number).toUpperCase() !== 'ALL') {
      const { clause, params: bParams } = buildBusNumberSql('f.bus_number', bus_number);
      conditions.push(clause);
      params.push(...bParams);
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
    // Strict restriction: Faculty MUST NOT see Education student issue submissions
    const sectorPlaceholders = CAMPUS_SECTOR_CATEGORIES.map(() => '?').join(', ');
    conditions.push(`f.category NOT IN (${sectorPlaceholders})`);
    params.push(...CAMPUS_SECTOR_CATEGORIES);
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
      if (portal.toLowerCase() === 'bus' && bus_number && String(bus_number).toUpperCase() !== 'ALL') {
        const { clause, params: bParams } = buildBusNumberSql('f.bus_number', bus_number);
        conditions.push(clause);
        params.push(...bParams);
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
    } else if (record.department && record.department.toLowerCase() !== user.department.toLowerCase()) {
      return {
        status: 403,
        message: `Forbidden: Faculty of "${user.department}" cannot access feedback from "${record.department}".`
      };
    } else if (record.submitter_role === 'faculty') {
      return {
        status: 403,
        message: 'Forbidden: Faculty cannot access feedback submitted by other faculty members.'
      };
    } else if (CAMPUS_SECTOR_CATEGORIES.includes(record.category)) {
      return {
        status: 403,
        message: 'Forbidden: Faculty members are not authorized to view Education student issue submissions.'
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

/**
 * Retrieve Education student issues for HOD & Management with sector analytics
 */
async function getEducationOtherIssues({ user, query = {} }) {
  // 1. Server-side role authorization
  if (user.role === 'faculty') {
    const err = new Error('Forbidden: Faculty members are not authorized to access student issues.');
    err.statusCode = 403;
    throw err;
  }

  if (user.role === 'student') {
    const err = new Error('Forbidden: Students cannot access the administrative other issues endpoint.');
    err.statusCode = 403;
    throw err;
  }

  if (user.role !== 'hod' && user.role !== 'management') {
    const err = new Error('Forbidden: Only Education HOD and Management can access Education other issues.');
    err.statusCode = 403;
    throw err;
  }

  const {
    sector,
    status,
    search,
    page = 1,
    limit = 50,
    department: requestedDept
  } = query;

  // 2. Department scoping
  let targetDepartment = null;
  if (user.role === 'hod') {
    targetDepartment = user.department;
    if (!targetDepartment) {
      const err = new Error('Forbidden: HOD profile does not have an assigned department.');
      err.statusCode = 400;
      throw err;
    }
  } else if (user.role === 'management') {
    if (requestedDept && requestedDept.toLowerCase() !== 'all' && requestedDept.toLowerCase() !== 'all departments') {
      targetDepartment = requestedDept.trim();
    }
  }

  const placeholders = CAMPUS_SECTOR_CATEGORIES.map(() => '?').join(', ');
  const baseConditions = [
    "f.portal = 'education'",
    "(u.role = 'student' OR (f.user_id IS NULL AND u.role IS NULL))",
    `f.category IN (${placeholders})`
  ];
  const baseParams = [...CAMPUS_SECTOR_CATEGORIES];

  if (targetDepartment) {
    baseConditions.push('LOWER(f.department) = LOWER(?)');
    baseParams.push(targetDepartment);
  }

  const baseWhereClause = `WHERE ${baseConditions.join(' AND ')}`;

  // 3. Sector breakdown analytics (calculated dynamically from database within authorized scope)
  const [breakdownRows] = await pool.query(`
    SELECT 
      CASE 
        WHEN f.category IN ('Food / Canteen', 'Canteen', 'Food') THEN 'Food / Canteen'
        WHEN f.category IN ('Furniture / Infrastructure', 'Infrastructure') THEN 'Furniture / Infrastructure'
        WHEN f.category IN ('Computer / IT', 'Internet') THEN 'Computer / IT'
        WHEN f.category IN ('Other campus facilities', 'Other') THEN 'Other campus facilities'
        ELSE f.category 
      END AS sector,
      COUNT(*) AS count
    FROM feedback f
    LEFT JOIN users u ON f.user_id = u.id
    ${baseWhereClause}
    GROUP BY sector
    ORDER BY count DESC
  `, baseParams);

  // 4. Summary metrics
  const [summaryRows] = await pool.query(`
    SELECT 
      COUNT(*) AS totalIssues,
      SUM(CASE WHEN f.status NOT IN ('resolved', 'closed') THEN 1 ELSE 0 END) AS pendingIssues,
      SUM(CASE WHEN f.status IN ('resolved', 'closed') THEN 1 ELSE 0 END) AS resolvedIssues
    FROM feedback f
    LEFT JOIN users u ON f.user_id = u.id
    ${baseWhereClause}
  `, baseParams);

  const totalIssues = Number(summaryRows[0]?.totalIssues) || 0;
  const pendingIssues = Number(summaryRows[0]?.pendingIssues) || 0;
  const resolvedIssues = Number(summaryRows[0]?.resolvedIssues) || 0;

  const sectorBreakdown = breakdownRows.map(r => ({
    sector: r.sector,
    count: Number(r.count),
    percentage: totalIssues > 0 ? Math.round((Number(r.count) / totalIssues) * 100) : 0
  }));

  // 5. Build filtered query for issues table
  const filterConditions = [...baseConditions];
  const filterParams = [...baseParams];

  if (status && status.toLowerCase() !== 'all') {
    filterConditions.push('LOWER(f.status) = LOWER(?)');
    filterParams.push(status.trim());
  }

  if (sector && sector.toLowerCase() !== 'all') {
    const s = sector.trim();
    if (s === 'Food / Canteen') {
      filterConditions.push("f.category IN ('Food / Canteen', 'Canteen', 'Food')");
    } else if (s === 'Furniture / Infrastructure') {
      filterConditions.push("f.category IN ('Furniture / Infrastructure', 'Infrastructure')");
    } else if (s === 'Computer / IT') {
      filterConditions.push("f.category IN ('Computer / IT', 'Internet')");
    } else if (s === 'Other campus facilities') {
      filterConditions.push("f.category IN ('Other campus facilities', 'Other')");
    } else {
      filterConditions.push('f.category = ?');
      filterParams.push(s);
    }
  }

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    filterConditions.push('(f.comment LIKE ? OR f.category LIKE ? OR u.name LIKE ? OR u.register_number LIKE ?)');
    filterParams.push(term, term, term, term);
  }

  const filterWhereClause = `WHERE ${filterConditions.join(' AND ')}`;

  // Count filtered issues
  const [filteredCountRows] = await pool.query(`
    SELECT COUNT(*) AS totalFiltered
    FROM feedback f
    LEFT JOIN users u ON f.user_id = u.id
    ${filterWhereClause}
  `, filterParams);
  const totalFiltered = Number(filteredCountRows[0]?.totalFiltered) || 0;

  // Pagination
  const validPage = Math.max(1, parseInt(page, 10) || 1);
  const validLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const offset = (validPage - 1) * validLimit;

  // Query issues
  const issueQueryParams = [...filterParams, validLimit, offset];
  const [issueRows] = await pool.query(`
    SELECT 
      f.id,
      f.feedback_code,
      f.category,
      f.comment,
      f.rating,
      f.priority,
      f.urgency,
      f.status,
      f.status_notes,
      f.image_url,
      f.location,
      f.department,
      f.created_at,
      u.id AS student_user_id,
      u.name AS student_name,
      u.register_number,
      u.year AS student_year,
      f.academic_year
    FROM feedback f
    LEFT JOIN users u ON f.user_id = u.id
    ${filterWhereClause}
    ORDER BY f.created_at DESC
    LIMIT ? OFFSET ?
  `, issueQueryParams);

  const formattedIssues = issueRows.map((r) => {
    let sectorName = r.category;
    if (['Food / Canteen', 'Canteen', 'Food'].includes(r.category)) sectorName = 'Food / Canteen';
    else if (['Furniture / Infrastructure', 'Infrastructure'].includes(r.category)) sectorName = 'Furniture / Infrastructure';
    else if (['Computer / IT', 'Internet'].includes(r.category)) sectorName = 'Computer / IT';
    else if (['Other campus facilities', 'Other'].includes(r.category)) sectorName = 'Other campus facilities';

    const studentName = r.student_name || 'Student';
    const registerNumber = r.register_number || (r.student_user_id ? `REG-${r.student_user_id}` : 'N/A');
    const year = r.student_year || r.academic_year || '3rd Year';

    return {
      id: r.id,
      feedbackCode: r.feedback_code,
      studentName,
      registerNumber,
      year,
      sector: sectorName,
      rawCategory: r.category,
      description: r.comment,
      imageUrl: r.image_url || null,
      status: r.status || 'submitted',
      statusNotes: r.status_notes || null,
      severity: (r.priority || r.urgency || 'medium').toLowerCase(),
      rating: r.rating || 3,
      location: r.location || null,
      department: r.department,
      submissionDate: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
    };
  });

  return {
    summary: {
      totalIssues,
      pendingIssues,
      resolvedIssues,
      topSector: sectorBreakdown[0]?.sector || 'None'
    },
    sectorBreakdown,
    issues: formattedIssues,
    pagination: {
      page: validPage,
      limit: validLimit,
      total: totalFiltered,
      totalPages: Math.ceil(totalFiltered / validLimit) || 1
    }
  };
}

module.exports = {
  OFFICIAL_DEPARTMENTS,
  SUPPORTED_CATEGORIES,
  SUPPORTED_STATUSES,
  CAMPUS_SECTOR_CATEGORIES,
  createFeedback,
  getFeedbackList,
  getFeedbackById,
  updateFeedback,
  deleteFeedback,
  getEducationOtherIssues
};
