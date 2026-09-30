const { pool } = require('../config/db');
const aiService = require('./aiService');

const VALID_QUESTION_TYPES = ['mcq', 'rating', 'yes_no', 'text'];

/**
 * Helper: Resolve department ID and canonical name safely
 */
async function resolveUserDepartment(user) {
  if (user.department_id && user.department) {
    return {
      departmentId: user.department_id,
      department: user.department
    };
  }

  if (user.department) {
    const [rows] = await pool.query(
      'SELECT id, name FROM departments WHERE LOWER(name) = LOWER(?) LIMIT 1',
      [user.department.trim()]
    );
    if (rows.length > 0) {
      return {
        departmentId: rows[0].id,
        department: rows[0].name
      };
    }
  }

  if (user.department_id) {
    const [rows] = await pool.query(
      'SELECT id, name FROM departments WHERE id = ? LIMIT 1',
      [user.department_id]
    );
    if (rows.length > 0) {
      return {
        departmentId: rows[0].id,
        department: rows[0].name
      };
    }
  }

  return { departmentId: null, department: null };
}

/**
 * Helper to check if user has management permissions over a form
 */
function canUserManageForm(form, user) {
  if (!form || !user) return false;
  if (user.role === 'management') return true;

  const formPortal = form.portal || 'education';

  if (formPortal === 'bus') {
    if (user.role === 'transport_incharge') return true;
    if (user.role === 'bus_incharge') {
      return !form.bus_number || form.bus_number === user.bus_number;
    }
    return false;
  }

  if (formPortal === 'hostel') {
    if (user.role === 'hostel_warden') {
      return !form.floor || form.floor === user.assigned_floor;
    }
    return false;
  }

  // Education
  if (user.role === 'hod') {
    return Boolean(
      (user.department_id && form.department_id === user.department_id) ||
      (user.department && form.department && form.department.toLowerCase() === user.department.toLowerCase())
    );
  }

  return false;
}

/**
 * 1. CREATE FORM (Draft)
 */
async function createForm({
  title,
  description = null,
  targetAudience = 'student',
  target_audience = null,
  targetAcademicYear = null,
  targetSemester = null,
  questions = [],
  user
}) {
  if (!title || typeof title !== 'string' || title.trim().length < 3) {
    throw new Error('Form title is required and must be at least 3 characters.');
  }

  const audience = (target_audience || targetAudience || 'student').toLowerCase().trim();
  if (audience !== 'student' && audience !== 'faculty') {
    throw new Error('Target audience must be either "student" or "faculty".');
  }

  const userPortal = user.portal || (
    user.role === 'bus_incharge' || user.role === 'transport_incharge' ? 'bus' :
    user.role === 'hostel_warden' ? 'hostel' : 'education'
  );

  let formPortal = 'education';
  let formBusNumber = null;
  let formFloor = null;
  let departmentId = null;
  let department = null;

  if (userPortal === 'bus' || user.role === 'bus_incharge' || user.role === 'transport_incharge') {
    formPortal = 'bus';
    if (user.role === 'bus_incharge') {
      formBusNumber = user.bus_number;
    } else {
      formBusNumber = user.bus_number || null;
    }
  } else if (userPortal === 'hostel' || user.role === 'hostel_warden') {
    formPortal = 'hostel';
    if (user.role === 'hostel_warden') {
      formFloor = user.assigned_floor;
    } else {
      formFloor = user.floor || null;
    }
  } else {
    // Education form
    formPortal = 'education';
    const deptInfo = await resolveUserDepartment(user);
    departmentId = deptInfo.departmentId;
    department = deptInfo.department;
    if (!departmentId || !department) {
      throw new Error(`User does not have a valid assigned department.`);
    }
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [formResult] = await connection.query(
      `INSERT INTO feedback_forms (
        portal, bus_number, floor,
        department_id, department, created_by, title, description,
        target_audience, target_academic_year, target_semester, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
      [
        formPortal,
        formBusNumber,
        formFloor,
        departmentId,
        department,
        user.id,
        title.trim(),
        description ? description.trim() : null,
        audience,
        targetAcademicYear ? targetAcademicYear.trim() : null,
        targetSemester ? targetSemester.trim() : null
      ]
    );

    const formId = formResult.insertId;

    // If initial questions provided, insert them atomically
    if (Array.isArray(questions) && questions.length > 0) {
      let sortOrder = 1;
      for (const q of questions) {
        if (!q.question_text || typeof q.question_text !== 'string' || q.question_text.trim().length === 0) {
          throw new Error(`Question ${sortOrder} text is required.`);
        }
        if (!VALID_QUESTION_TYPES.includes(q.question_type)) {
          throw new Error(`Question ${sortOrder} type must be one of: ${VALID_QUESTION_TYPES.join(', ')}.`);
        }

        let optionsJson = null;
        if (q.question_type === 'mcq') {
          if (!Array.isArray(q.options) || q.options.length < 2) {
            throw new Error(`Question ${sortOrder} (MCQ) must have at least 2 options.`);
          }
          optionsJson = JSON.stringify(q.options.map(opt => String(opt).trim()));
        } else if (q.question_type === 'yes_no') {
          optionsJson = JSON.stringify(['Yes', 'No']);
        }

        const isRequired = q.is_required !== undefined ? Boolean(q.is_required) : true;
        const currentOrder = typeof q.sort_order === 'number' ? q.sort_order : sortOrder;

        await connection.query(
          `INSERT INTO form_questions (
            form_id, question_text, question_type, options, is_required, sort_order
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            formId,
            q.question_text.trim(),
            q.question_type,
            optionsJson,
            isRequired,
            currentOrder
          ]
        );
        sortOrder++;
      }
    }

    await connection.commit();

    // Return created form with questions
    const [createdRows] = await pool.query(
      'SELECT * FROM feedback_forms WHERE id = ?',
      [formId]
    );
    const [questionRows] = await pool.query(
      'SELECT * FROM form_questions WHERE form_id = ? ORDER BY sort_order ASC, id ASC',
      [formId]
    );

    return {
      ...createdRows[0],
      questions: questionRows.map(q => ({
        ...q,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
      }))
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 2. GET FORMS (Role-aware list)
 */
async function getForms({ user, status = null, department = null, targetAudience = null, target_audience = null, page = 1, limit = 50, portal = null, bus_number = null, floor = null }) {
  const conditions = [];
  const params = [];

  const offset = Math.max(0, (parseInt(page, 10) - 1) * parseInt(limit, 10));
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const audienceFilter = target_audience || targetAudience;

  if (user.role === 'student') {
    conditions.push("ff.status = 'published'");
    conditions.push("ff.target_audience = 'student'");

    const userPortal = user.portal || 'education';
    if (userPortal === 'bus') {
      conditions.push("ff.portal = 'bus'");
      if (user.bus_number) {
        conditions.push('(ff.bus_number IS NULL OR ff.bus_number = ?)');
        params.push(user.bus_number);
      }
    } else if (userPortal === 'hostel') {
      conditions.push("ff.portal = 'hostel'");
      if (user.floor) {
        conditions.push('(ff.floor IS NULL OR ff.floor = ?)');
        params.push(user.floor);
      }
    } else {
      conditions.push("(ff.portal = 'education' OR ff.portal IS NULL)");
      conditions.push('(ff.department_id = ? OR LOWER(ff.department) = LOWER(?))');
      params.push(user.department_id || 0, user.department || '');
    }
  } else if (user.role === 'faculty' || user.role === 'hod') {
    conditions.push("(ff.portal = 'education' OR ff.portal IS NULL)");
    conditions.push('(ff.department_id = ? OR LOWER(ff.department) = LOWER(?))');
    params.push(user.department_id || 0, user.department || '');

    if (status) {
      conditions.push('ff.status = ?');
      params.push(status);
    }
    if (audienceFilter) {
      conditions.push('ff.target_audience = ?');
      params.push(audienceFilter);
    }
  } else if (user.role === 'bus_incharge') {
    conditions.push("ff.portal = 'bus'");
    if (user.bus_number) {
      conditions.push('(ff.bus_number IS NULL OR ff.bus_number = ?)');
      params.push(user.bus_number);
    }
    if (status) {
      conditions.push('ff.status = ?');
      params.push(status);
    }
    if (audienceFilter) {
      conditions.push('ff.target_audience = ?');
      params.push(audienceFilter);
    }
  } else if (user.role === 'transport_incharge') {
    conditions.push("ff.portal = 'bus'");
    const targetBus = bus_number || user.bus_number;
    if (targetBus) {
      conditions.push('(ff.bus_number IS NULL OR ff.bus_number = ?)');
      params.push(targetBus);
    }
    if (status) {
      conditions.push('ff.status = ?');
      params.push(status);
    }
    if (audienceFilter) {
      conditions.push('ff.target_audience = ?');
      params.push(audienceFilter);
    }
  } else if (user.role === 'hostel_warden') {
    conditions.push("ff.portal = 'hostel'");
    if (user.assigned_floor) {
      conditions.push('(ff.floor IS NULL OR ff.floor = ?)');
      params.push(user.assigned_floor);
    }
    if (status) {
      conditions.push('ff.status = ?');
      params.push(status);
    }
    if (audienceFilter) {
      conditions.push('ff.target_audience = ?');
      params.push(audienceFilter);
    }
  } else if (user.role === 'management') {
    const activePortal = portal || user.portal;
    if (activePortal && activePortal !== 'all') {
      conditions.push('ff.portal = ?');
      params.push(activePortal);
    }
    if (department && department !== 'ALL' && department !== 'all') {
      conditions.push('(LOWER(ff.department) = LOWER(?) OR ff.department_id = ?)');
      params.push(department, parseInt(department, 10) || 0);
    }
    if (bus_number) {
      conditions.push('ff.bus_number = ?');
      params.push(bus_number);
    }
    if (floor) {
      conditions.push('ff.floor = ?');
      params.push(floor);
    }
    if (status) {
      conditions.push('ff.status = ?');
      params.push(status);
    }
    if (audienceFilter) {
      conditions.push('ff.target_audience = ?');
      params.push(audienceFilter);
    }
  } else {
    throw new Error('Unauthorized role.');
  }

  const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Query forms with question count, submission count, and student submission status
  let studentJoin = '';
  let studentSelect = '';
  if (user.role === 'student') {
    studentSelect = ', (fs_user.id IS NOT NULL) AS has_submitted, fs_user.submitted_at AS my_submitted_at';
    studentJoin = `LEFT JOIN form_submissions fs_user ON fs_user.form_id = ff.id AND fs_user.student_id = ${pool.escape(user.id)}`;
  }

  const query = `
    SELECT 
      ff.*,
      d.name AS department_name,
      d.code AS department_code,
      u.name AS creator_name,
      COUNT(DISTINCT fq.id) AS question_count,
      COUNT(DISTINCT fs.id) AS submission_count
      ${studentSelect}
    FROM feedback_forms ff
    LEFT JOIN departments d ON ff.department_id = d.id
    LEFT JOIN users u ON ff.created_by = u.id
    LEFT JOIN form_questions fq ON fq.form_id = ff.id
    LEFT JOIN form_submissions fs ON fs.form_id = ff.id
    ${studentJoin}
    ${whereSql}
    GROUP BY ff.id
    ORDER BY ff.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const queryParams = [...params, parsedLimit, offset];
  const [rows] = await pool.query(query, queryParams);

  // Count query for pagination
  const countQuery = `
    SELECT COUNT(DISTINCT ff.id) AS total
    FROM feedback_forms ff
    ${whereSql}
  `;
  const [countRows] = await pool.query(countQuery, params);
  const total = countRows[0]?.total || 0;

  return {
    forms: rows.map(r => ({
      ...r,
      has_submitted: Boolean(r.has_submitted),
      question_count: parseInt(r.question_count, 10) || 0,
      submission_count: parseInt(r.submission_count, 10) || 0
    })),
    pagination: {
      page: parseInt(page, 10),
      limit: parsedLimit,
      total,
      totalPages: Math.ceil(total / parsedLimit)
    }
  };
}

/**
 * 2b. GET FACULTY FORMS (Published faculty surveys for department, or submitted history)
 */
async function getFacultyForms({ user, submittedOnly = false, page = 1, limit = 50 }) {
  if (user.role !== 'faculty') {
    throw new Error('Forbidden: Endpoint is reserved for faculty role.');
  }

  const offset = Math.max(0, (parseInt(page, 10) - 1) * parseInt(limit, 10));
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10)));

  const conditions = [
    "ff.target_audience = 'faculty'",
    '(ff.department_id = ? OR LOWER(ff.department) = LOWER(?))'
  ];
  const params = [user.department_id || 0, user.department || ''];

  if (submittedOnly) {
    conditions.push('fs_user.id IS NOT NULL');
    conditions.push("ff.status IN ('published', 'closed')");
  } else {
    conditions.push("ff.status = 'published'");
  }

  const whereSql = `WHERE ${conditions.join(' AND ')}`;

  const query = `
    SELECT 
      ff.*,
      d.name AS department_name,
      d.code AS department_code,
      u.name AS creator_name,
      COUNT(DISTINCT fq.id) AS question_count,
      COUNT(DISTINCT fs.id) AS submission_count,
      (fs_user.id IS NOT NULL) AS has_submitted,
      fs_user.submitted_at AS my_submitted_at
    FROM feedback_forms ff
    LEFT JOIN departments d ON ff.department_id = d.id
    LEFT JOIN users u ON ff.created_by = u.id
    LEFT JOIN form_questions fq ON fq.form_id = ff.id
    LEFT JOIN form_submissions fs ON fs.form_id = ff.id
    LEFT JOIN form_submissions fs_user ON fs_user.form_id = ff.id AND fs_user.student_id = ${pool.escape(user.id)}
    ${whereSql}
    GROUP BY ff.id
    ORDER BY ff.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const queryParams = [...params, parsedLimit, offset];
  const [rows] = await pool.query(query, queryParams);

  let countJoin = '';
  if (submittedOnly) {
    countJoin = `LEFT JOIN form_submissions fs_user ON fs_user.form_id = ff.id AND fs_user.student_id = ${pool.escape(user.id)}`;
  }

  const countQuery = `
    SELECT COUNT(DISTINCT ff.id) AS total
    FROM feedback_forms ff
    ${countJoin}
    ${whereSql}
  `;
  const [countRows] = await pool.query(countQuery, params);
  const total = countRows[0]?.total || 0;

  return {
    forms: rows.map(r => ({
      ...r,
      has_submitted: Boolean(r.has_submitted),
      question_count: parseInt(r.question_count, 10) || 0,
      submission_count: parseInt(r.submission_count, 10) || 0
    })),
    pagination: {
      page: parseInt(page, 10),
      limit: parsedLimit,
      total,
      totalPages: Math.ceil(total / parsedLimit)
    }
  };
}

/**
 * 3. GET FORM BY ID (With access control & question list)
 */
async function getFormById(formId, user) {
  const [rows] = await pool.query(
    `SELECT 
      ff.*,
      d.name AS department_name,
      d.code AS department_code,
      u.name AS creator_name,
      COUNT(DISTINCT fs.id) AS submission_count
    FROM feedback_forms ff
    LEFT JOIN departments d ON ff.department_id = d.id
    LEFT JOIN users u ON ff.created_by = u.id
    LEFT JOIN form_submissions fs ON fs.form_id = ff.id
    WHERE ff.id = ?
    GROUP BY ff.id`,
    [formId]
  );

  if (rows.length === 0) {
    return null;
  }

  const form = rows[0];

  // Role and Department Isolation Check
  const formPortal = form.portal || 'education';

  if (user.role === 'student') {
    if (form.status !== 'published' || form.target_audience === 'faculty') {
      return { forbidden: true, reason: 'Students can only access published student forms.' };
    }
    if (formPortal === 'bus') {
      if (user.portal !== 'bus') {
        return { forbidden: true, reason: 'Students can only access bus forms within the Bus portal.' };
      }
      if (form.bus_number && user.bus_number && form.bus_number !== user.bus_number) {
        return { forbidden: true, reason: 'Form is not assigned to your bus.' };
      }
    } else if (formPortal === 'hostel') {
      if (user.portal !== 'hostel') {
        return { forbidden: true, reason: 'Students can only access hostel forms within the Hostel portal.' };
      }
      if (form.floor && user.floor && form.floor !== user.floor) {
        return { forbidden: true, reason: 'Form is not assigned to your floor.' };
      }
    } else {
      const isOwnDept = (
        (user.department_id && form.department_id === user.department_id) ||
        (user.department && form.department && form.department.toLowerCase() === user.department.toLowerCase())
      );
      if (!isOwnDept) {
        return { forbidden: true, reason: 'Students can only access published student forms within their assigned department.' };
      }
    }
  } else if (user.role === 'faculty') {
    if (formPortal !== 'education') {
      return { forbidden: true, reason: 'Faculty can only access education forms.' };
    }
    const isOwnDept = (
      (user.department_id && form.department_id === user.department_id) ||
      (user.department && form.department && form.department.toLowerCase() === user.department.toLowerCase())
    );
    if (!isOwnDept) {
      return { forbidden: true, reason: `Forbidden: You cannot access forms belonging to "${form.department}".` };
    }
  } else if (user.role === 'hod') {
    if (formPortal !== 'education') {
      return { forbidden: true, reason: 'HOD can only access education forms.' };
    }
    const isOwnDept = (
      (user.department_id && form.department_id === user.department_id) ||
      (user.department && form.department && form.department.toLowerCase() === user.department.toLowerCase())
    );
    if (!isOwnDept) {
      return { forbidden: true, reason: `Forbidden: You cannot access forms belonging to "${form.department}".` };
    }
  } else if (user.role === 'bus_incharge') {
    if (formPortal !== 'bus') {
      return { forbidden: true, reason: 'Bus incharge can only access bus forms.' };
    }
    if (form.bus_number && user.bus_number && form.bus_number !== user.bus_number) {
      return { forbidden: true, reason: 'Forbidden: You cannot access forms belonging to another bus.' };
    }
  } else if (user.role === 'transport_incharge') {
    if (formPortal !== 'bus') {
      return { forbidden: true, reason: 'Transport incharge can only access bus forms.' };
    }
  } else if (user.role === 'hostel_warden') {
    if (formPortal !== 'hostel') {
      return { forbidden: true, reason: 'Hostel warden can only access hostel forms.' };
    }
    if (form.floor && user.assigned_floor && form.floor !== user.assigned_floor) {
      return { forbidden: true, reason: 'Forbidden: You cannot access forms belonging to another floor.' };
    }
  }

  // Fetch questions
  const [questionRows] = await pool.query(
    'SELECT * FROM form_questions WHERE form_id = ? ORDER BY sort_order ASC, id ASC',
    [formId]
  );

  const questions = questionRows.map(q => ({
    ...q,
    options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
    is_required: Boolean(q.is_required)
  }));

  // If student, check submission status
  let submissionStatus = null;
  if (user.role === 'student') {
    const [subRows] = await pool.query(
      'SELECT id, submitted_at FROM form_submissions WHERE form_id = ? AND student_id = ?',
      [formId, user.id]
    );
    submissionStatus = {
      hasSubmitted: subRows.length > 0,
      submittedAt: subRows[0]?.submitted_at || null
    };
  }

  return {
    ...form,
    submission_count: parseInt(form.submission_count, 10) || 0,
    questions,
    submissionStatus
  };
}

/**
 * 4. UPDATE DRAFT FORM (Title, Description, Metadata)
 */
async function updateForm(formId, updateData, user) {
  const [rows] = await pool.query('SELECT * FROM feedback_forms WHERE id = ?', [formId]);
  if (rows.length === 0) return null;

  const form = rows[0];

  if (!canUserManageForm(form, user)) {
    return { forbidden: true, message: 'Forbidden: You do not have permission to modify this form.' };
  }

  if (form.status !== 'draft') {
    return { statusConflict: true, message: `Cannot modify form: Form is already "${form.status}". Only draft forms can be modified.` };
  }

  const updates = [];
  const params = [];

  if (updateData.title !== undefined) {
    if (!updateData.title || typeof updateData.title !== 'string' || updateData.title.trim().length < 3) {
      throw new Error('Title must be at least 3 characters.');
    }
    updates.push('title = ?');
    params.push(updateData.title.trim());
  }

  if (updateData.description !== undefined) {
    updates.push('description = ?');
    params.push(updateData.description ? updateData.description.trim() : null);
  }

  if (updateData.target_academic_year !== undefined || updateData.targetAcademicYear !== undefined) {
    const val = updateData.target_academic_year ?? updateData.targetAcademicYear;
    updates.push('target_academic_year = ?');
    params.push(val ? String(val).trim() : null);
  }

  if (updateData.target_semester !== undefined || updateData.targetSemester !== undefined) {
    const val = updateData.target_semester ?? updateData.targetSemester;
    updates.push('target_semester = ?');
    params.push(val ? String(val).trim() : null);
  }

  if (updates.length === 0) {
    return form;
  }

  params.push(formId);
  await pool.query(
    `UPDATE feedback_forms SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
    params
  );

  return getFormById(formId, user);
}

/**
 * 5. ADD QUESTION TO DRAFT FORM
 */
async function addQuestion(formId, questionData, user) {
  const [rows] = await pool.query('SELECT * FROM feedback_forms WHERE id = ?', [formId]);
  if (rows.length === 0) return null;

  if (!canUserManageForm(form, user)) {
    return { forbidden: true, message: 'Forbidden: You do not have permission to modify this form.' };
  }

  if (form.status !== 'draft') {
    return { statusConflict: true, message: `Cannot add questions: Form is "${form.status}". Questions are immutable once published.` };
  }

  const { question_text, question_type, options, is_required, sort_order } = questionData;

  if (!question_text || typeof question_text !== 'string' || question_text.trim().length === 0) {
    throw new Error('Question text is required.');
  }

  if (!VALID_QUESTION_TYPES.includes(question_type)) {
    throw new Error(`Question type must be one of: ${VALID_QUESTION_TYPES.join(', ')}.`);
  }

  let optionsJson = null;
  if (question_type === 'mcq') {
    if (!Array.isArray(options) || options.length < 2) {
      throw new Error('MCQ questions must have at least 2 options.');
    }
    optionsJson = JSON.stringify(options.map(opt => String(opt).trim()));
  } else if (question_type === 'yes_no') {
    optionsJson = JSON.stringify(['Yes', 'No']);
  }

  // Determine sort order
  let orderToUse = sort_order;
  if (typeof orderToUse !== 'number') {
    const [maxOrderRows] = await pool.query(
      'SELECT COALESCE(MAX(sort_order), 0) AS max_order FROM form_questions WHERE form_id = ?',
      [formId]
    );
    orderToUse = (maxOrderRows[0]?.max_order || 0) + 1;
  }

  const isReq = is_required !== undefined ? Boolean(is_required) : true;

  const [insertRes] = await pool.query(
    `INSERT INTO form_questions (
      form_id, question_text, question_type, options, is_required, sort_order
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [formId, question_text.trim(), question_type, optionsJson, isReq, orderToUse]
  );

  const [createdQuestion] = await pool.query(
    'SELECT * FROM form_questions WHERE id = ?',
    [insertRes.insertId]
  );

  return {
    ...createdQuestion[0],
    options: typeof createdQuestion[0].options === 'string' ? JSON.parse(createdQuestion[0].options) : createdQuestion[0].options,
    is_required: Boolean(createdQuestion[0].is_required)
  };
}

/**
 * 6. UPDATE QUESTION IN DRAFT FORM
 */
async function updateQuestion(formId, questionId, questionData, user) {
  const [rows] = await pool.query('SELECT * FROM feedback_forms WHERE id = ?', [formId]);
  if (rows.length === 0) return null;

  if (!canUserManageForm(form, user)) {
    return { forbidden: true, message: 'Forbidden: You do not have permission to modify this form.' };
  }

  if (form.status !== 'draft') {
    return { statusConflict: true, message: `Cannot edit questions: Form is "${form.status}". Questions are immutable once published.` };
  }

  const [qRows] = await pool.query(
    'SELECT * FROM form_questions WHERE id = ? AND form_id = ?',
    [questionId, formId]
  );
  if (qRows.length === 0) {
    return { notFound: true, message: `Question #${questionId} not found in this form.` };
  }

  const currentQ = qRows[0];
  const updates = [];
  const params = [];

  const textToSet = questionData.question_text !== undefined ? questionData.question_text : currentQ.question_text;
  const typeToSet = questionData.question_type !== undefined ? questionData.question_type : currentQ.question_type;

  if (!textToSet || typeof textToSet !== 'string' || textToSet.trim().length === 0) {
    throw new Error('Question text cannot be empty.');
  }
  if (!VALID_QUESTION_TYPES.includes(typeToSet)) {
    throw new Error(`Invalid question type. Must be one of: ${VALID_QUESTION_TYPES.join(', ')}.`);
  }

  updates.push('question_text = ?');
  params.push(textToSet.trim());

  updates.push('question_type = ?');
  params.push(typeToSet);

  if (typeToSet === 'mcq') {
    const opts = questionData.options !== undefined ? questionData.options : (typeof currentQ.options === 'string' ? JSON.parse(currentQ.options) : currentQ.options);
    if (!Array.isArray(opts) || opts.length < 2) {
      throw new Error('MCQ questions must have at least 2 options.');
    }
    updates.push('options = ?');
    params.push(JSON.stringify(opts.map(o => String(o).trim())));
  } else if (typeToSet === 'yes_no') {
    updates.push('options = ?');
    params.push(JSON.stringify(['Yes', 'No']));
  } else {
    updates.push('options = ?');
    params.push(null);
  }

  if (questionData.is_required !== undefined) {
    updates.push('is_required = ?');
    params.push(Boolean(questionData.is_required));
  }

  if (questionData.sort_order !== undefined) {
    updates.push('sort_order = ?');
    params.push(parseInt(questionData.sort_order, 10) || 1);
  }

  params.push(questionId);
  params.push(formId);

  await pool.query(
    `UPDATE form_questions SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ? AND form_id = ?`,
    params
  );

  const [updatedRows] = await pool.query('SELECT * FROM form_questions WHERE id = ?', [questionId]);
  return {
    ...updatedRows[0],
    options: typeof updatedRows[0].options === 'string' ? JSON.parse(updatedRows[0].options) : updatedRows[0].options,
    is_required: Boolean(updatedRows[0].is_required)
  };
}

/**
 * 7. DELETE QUESTION FROM DRAFT FORM
 */
async function deleteQuestion(formId, questionId, user) {
  const [rows] = await pool.query('SELECT * FROM feedback_forms WHERE id = ?', [formId]);
  if (rows.length === 0) return null;

  const form = rows[0];
  if (!canUserManageForm(form, user)) {
    return { forbidden: true, message: 'Forbidden: You do not have permission to modify this form.' };
  }

  if (form.status !== 'draft') {
    return { statusConflict: true, message: `Cannot delete questions: Form is "${form.status}". Questions are immutable once published.` };
  }

  const [qRows] = await pool.query(
    'SELECT * FROM form_questions WHERE id = ? AND form_id = ?',
    [questionId, formId]
  );
  if (qRows.length === 0) {
    return { notFound: true, message: `Question #${questionId} not found in this form.` };
  }

  await pool.query('DELETE FROM form_questions WHERE id = ? AND form_id = ?', [questionId, formId]);
  return { success: true, deletedQuestionId: questionId };
}

/**
 * 8. PUBLISH FORM (draft -> published)
 */
async function publishForm(formId, user) {
  const [rows] = await pool.query('SELECT * FROM feedback_forms WHERE id = ?', [formId]);
  if (rows.length === 0) return null;

  const form = rows[0];
  if (!canUserManageForm(form, user)) {
    return { forbidden: true, message: 'Forbidden: You do not have permission to publish this form.' };
  }

  if (form.status === 'published') {
    return { statusConflict: true, message: 'Form is already published.' };
  }
  if (form.status === 'closed') {
    return { statusConflict: true, message: 'Cannot publish a closed form. Form lifecycle does not permit reopening.' };
  }

  // Verification: Form must have title and at least one question
  if (!form.title || form.title.trim().length === 0) {
    throw new Error('Form must have a valid title to be published.');
  }

  const [questions] = await pool.query(
    'SELECT id FROM form_questions WHERE form_id = ?',
    [formId]
  );
  if (questions.length === 0) {
    throw new Error('Cannot publish a form without questions. Add at least one question before publishing.');
  }

  await pool.query(
    "UPDATE feedback_forms SET status = 'published', published_at = NOW(), updated_at = NOW() WHERE id = ?",
    [formId]
  );

  return getFormById(formId, user);
}

/**
 * 9. CLOSE FORM (published -> closed)
 */
async function closeForm(formId, user) {
  const [rows] = await pool.query('SELECT * FROM feedback_forms WHERE id = ?', [formId]);
  if (rows.length === 0) return null;

  const form = rows[0];
  if (!canUserManageForm(form, user)) {
    return { forbidden: true, message: 'Forbidden: You do not have permission to close this form.' };
  }

  if (form.status === 'closed') {
    return { statusConflict: true, message: 'Form is already closed.' };
  }
  if (form.status === 'draft') {
    return { statusConflict: true, message: 'Cannot close a draft form. Only published forms can be closed.' };
  }

  await pool.query(
    "UPDATE feedback_forms SET status = 'closed', closed_at = NOW(), updated_at = NOW() WHERE id = ?",
    [formId]
  );

  return getFormById(formId, user);
}

/**
 * 10. GET SUBMISSION STATUS
 */
async function getSubmissionStatus(formId, studentId) {
  const [rows] = await pool.query(
    'SELECT id, submitted_at, image_url FROM form_submissions WHERE form_id = ? AND student_id = ?',
    [formId, studentId]
  );

  if (rows.length === 0) {
    return { submitted: false, hasSubmitted: false, submittedAt: null, submissionId: null, imageUrl: null, answers: [] };
  }

  const [answerRows] = await pool.query(
    `SELECT fa.question_id, fa.rating_value, fa.selected_option, fa.text_response, 
            fq.question_text, fq.question_type, fq.sort_order
     FROM form_answers fa
     LEFT JOIN form_questions fq ON fa.question_id = fq.id
     WHERE fa.submission_id = ?
     ORDER BY fq.sort_order ASC, fa.id ASC`,
    [rows[0].id]
  );

  return {
    submitted: true,
    hasSubmitted: true,
    submittedAt: rows[0].submitted_at,
    submissionId: rows[0].id,
    imageUrl: rows[0].image_url || null,
    answers: answerRows
  };
}

/**
 * 11. SUBMIT FORM RESPONSE (Atomic Transaction with Strict Validation)
 */
async function submitFormResponse(formId, user, answers, imageUrl = null) {
  // 1. Fetch Form
  const [formRows] = await pool.query('SELECT * FROM feedback_forms WHERE id = ?', [formId]);
  if (formRows.length === 0) {
    return { errorType: 'NOT_FOUND', message: `Form #${formId} not found.` };
  }

  const form = formRows[0];

  // 2. Verify target audience matches user role
  const targetAudience = form.target_audience || 'student';
  if (targetAudience === 'student' && user.role !== 'student') {
    return { errorType: 'FORBIDDEN', message: 'Only students can submit responses to this Student Survey.' };
  }
  if (targetAudience === 'faculty' && user.role !== 'faculty') {
    return { errorType: 'FORBIDDEN', message: 'Only faculty members can submit responses to this Faculty Survey.' };
  }

  // 3. Verify Form is published
  if (form.status !== 'published') {
    return {
      errorType: 'INVALID_STATUS',
      message: form.status === 'closed'
        ? 'This form is closed. New submissions are no longer accepted.'
        : 'This form is in draft status and cannot accept submissions.'
    };
  }

  // 4. Verify department / portal match
  const formPortal = form.portal || 'education';
  if (formPortal === 'bus') {
    if (user.portal !== 'bus') {
      return {
        errorType: 'FORBIDDEN',
        message: 'Forbidden: Only students in the Bus portal can submit responses to this form.'
      };
    }
    if (form.bus_number && user.bus_number && form.bus_number !== user.bus_number) {
      return {
        errorType: 'FORBIDDEN',
        message: `Forbidden: Form is specific to bus "${form.bus_number}", but you are assigned to "${user.bus_number}".`
      };
    }
  } else if (formPortal === 'hostel') {
    if (user.portal !== 'hostel') {
      return {
        errorType: 'FORBIDDEN',
        message: 'Forbidden: Only students in the Hostel portal can submit responses to this form.'
      };
    }
    if (form.floor && user.floor && form.floor !== user.floor) {
      return {
        errorType: 'FORBIDDEN',
        message: `Forbidden: Form is specific to "${form.floor}", but you are assigned to "${user.floor}".`
      };
    }
  } else {
    const isOwnDept = (
      (user.department_id && form.department_id === user.department_id) ||
      (user.department && form.department && form.department.toLowerCase() === user.department.toLowerCase())
    );
    if (!isOwnDept) {
      return {
        errorType: 'FORBIDDEN',
        message: `Forbidden: Users of "${user.department}" cannot submit feedback for "${form.department}".`
      };
    }
  }

  // 5. Check if user already submitted (Backend pre-check)
  const [existingSub] = await pool.query(
    'SELECT id FROM form_submissions WHERE form_id = ? AND student_id = ?',
    [formId, user.id]
  );
  if (existingSub.length > 0) {
    return {
      errorType: 'DUPLICATE',
      message: 'You have already submitted this feedback form. Only one submission is permitted.'
    };
  }

  // 6. Fetch Form Questions
  const [questionRows] = await pool.query(
    'SELECT * FROM form_questions WHERE form_id = ? ORDER BY sort_order ASC, id ASC',
    [formId]
  );

  if (questionRows.length === 0) {
    return { errorType: 'BAD_REQUEST', message: 'This form does not contain any questions.' };
  }

  if (!Array.isArray(answers) || answers.length === 0) {
    return { errorType: 'BAD_REQUEST', message: 'Submitted answers must be a non-empty array.' };
  }

  // Build question lookup map
  const questionMap = new Map();
  for (const q of questionRows) {
    questionMap.set(q.id, {
      ...q,
      options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
      is_required: Boolean(q.is_required)
    });
  }

  // 7. Validate submitted answers
  const answerMap = new Map();
  for (const ans of answers) {
    const qId = parseInt(ans.question_id ?? ans.questionId, 10);
    if (isNaN(qId)) {
      return { errorType: 'BAD_REQUEST', message: 'Invalid question ID in submission.' };
    }

    // Question belongs strictly to this form
    if (!questionMap.has(qId)) {
      return {
        errorType: 'BAD_REQUEST',
        message: `Security violation: Question #${qId} does not belong to form #${formId}.`
      };
    }

    if (answerMap.has(qId)) {
      return {
        errorType: 'BAD_REQUEST',
        message: `Duplicate answer submitted for question #${qId}.`
      };
    }

    const questionDef = questionMap.get(qId);
    let parsedRating = null;
    let selectedOption = null;
    let textResponse = null;

    if (questionDef.question_type === 'rating') {
      const rVal = ans.rating_value ?? ans.ratingValue ?? ans.rating;
      parsedRating = parseInt(rVal, 10);
      if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
        return {
          errorType: 'BAD_REQUEST',
          message: `Rating for "${questionDef.question_text}" must be an integer between 1 and 5.`
        };
      }
    } else if (questionDef.question_type === 'mcq') {
      const chosen = ans.selected_option ?? ans.selectedOption;
      if (!chosen || typeof chosen !== 'string' || chosen.trim().length === 0) {
        return {
          errorType: 'BAD_REQUEST',
          message: `An option must be selected for MCQ question: "${questionDef.question_text}".`
        };
      }
      const normChosen = chosen.trim();
      const validOptions = Array.isArray(questionDef.options) ? questionDef.options : [];
      if (!validOptions.some(opt => opt.trim().toLowerCase() === normChosen.toLowerCase())) {
        return {
          errorType: 'BAD_REQUEST',
          message: `Invalid option "${chosen}" for question "${questionDef.question_text}". Must be one of: ${validOptions.join(', ')}.`
        };
      }
      selectedOption = normChosen;
    } else if (questionDef.question_type === 'yes_no') {
      const chosen = ans.selected_option ?? ans.selectedOption;
      if (!chosen || typeof chosen !== 'string') {
        return {
          errorType: 'BAD_REQUEST',
          message: `Selection for "${questionDef.question_text}" must be "Yes" or "No".`
        };
      }
      const norm = chosen.trim().toLowerCase();
      if (norm !== 'yes' && norm !== 'no') {
        return {
          errorType: 'BAD_REQUEST',
          message: `Invalid choice "${chosen}" for Yes/No question: "${questionDef.question_text}".`
        };
      }
      selectedOption = norm === 'yes' ? 'Yes' : 'No';
    } else if (questionDef.question_type === 'text') {
      const txt = ans.text_response ?? ans.textResponse ?? ans.text ?? ans.comment;
      textResponse = (txt && typeof txt === 'string') ? txt.trim() : null;
      if (questionDef.is_required && (!textResponse || textResponse.length === 0)) {
        return {
          errorType: 'BAD_REQUEST',
          message: `Answer is required for text question: "${questionDef.question_text}".`
        };
      }
    }

    answerMap.set(qId, {
      questionId: qId,
      ratingValue: parsedRating,
      selectedOption,
      textResponse
    });
  }

  // 8. Verify all required questions have been answered
  for (const [qId, qDef] of questionMap.entries()) {
    if (qDef.is_required && !answerMap.has(qId)) {
      return {
        errorType: 'BAD_REQUEST',
        message: `Required question was not answered: "${qDef.question_text}".`
      };
    }
  }

  // 9. Atomic Transaction to save submission and answers
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Insert Submission Envelope
    let submissionId;
    try {
      const [subResult] = await connection.query(
        'INSERT INTO form_submissions (form_id, student_id, image_url) VALUES (?, ?, ?)',
        [formId, user.id, imageUrl || null]
      );
      submissionId = subResult.insertId;
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
        await connection.rollback();
        return {
          errorType: 'DUPLICATE',
          message: 'You have already submitted this feedback form. Only one submission is permitted.'
        };
      }
      throw err;
    }

    // Insert Answers
    for (const [qId, ans] of answerMap.entries()) {
      await connection.query(
        `INSERT INTO form_answers (
          submission_id, question_id, rating_value, selected_option, text_response
        ) VALUES (?, ?, ?, ?, ?)`,
        [
          submissionId,
          qId,
          ans.ratingValue,
          ans.selectedOption,
          ans.textResponse
        ]
      );
    }

    // Invalidate stale AI analysis if previous analysis completed
    await connection.query(
      "UPDATE feedback_forms SET ai_status = 'pending' WHERE id = ? AND ai_status = 'completed'",
      [formId]
    );

    await connection.commit();

    return {
      success: true,
      data: {
        submissionId,
        formId,
        studentId: user.id,
        userId: user.id,
        answerCount: answerMap.size,
        submittedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
      return {
        errorType: 'DUPLICATE',
        message: 'You have already submitted this feedback form. Only one submission is permitted.'
      };
    }
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 12. GET FORM PARTICIPATION
 * Privacy-preserving participation metrics and respondent tracking for a form.
 * Does NOT query or return any question text, question IDs, rating values,
 * selected options, or text response answers.
 */
async function getFormParticipation(formId, user) {
  // 1. Fetch Form
  const [formRows] = await pool.query(
    `SELECT 
      ff.*,
      d.name AS department_name,
      d.code AS department_code
    FROM feedback_forms ff
    LEFT JOIN departments d ON ff.department_id = d.id
    WHERE ff.id = ?`,
    [formId]
  );

  if (formRows.length === 0) {
    return { notFound: true, message: `Form #${formId} not found.` };
  }

  const form = formRows[0];

  // 2. Authorization Checks
  if (user.role === 'student') {
    return {
      forbidden: true,
      message: 'Forbidden: Students are not permitted to view form participation data.'
    };
  }

  if (!canUserManageForm(form, user) && user.role !== 'faculty') {
    return {
      forbidden: true,
      message: 'Forbidden: You cannot access participation data for this form.'
    };
  }

  // 3. Fetch Targeted Cohort (Students or Faculty) in the form's department or portal
  const targetRole = form.target_audience === 'faculty' ? 'faculty' : 'student';
  let targetedCohort = [];
  if (form.portal === 'bus') {
    const busConds = ['role = ?', "portal = 'bus'"];
    const busParams = [targetRole];
    if (form.bus_number) {
      busConds.push('bus_number = ?');
      busParams.push(form.bus_number);
    }
    const [cohort] = await pool.query(
      `SELECT id, name, email FROM users WHERE ${busConds.join(' AND ')} ORDER BY name ASC`,
      busParams
    );
    targetedCohort = cohort;
  } else if (form.portal === 'hostel') {
    const hostelConds = ['role = ?', "portal = 'hostel'"];
    const hostelParams = [targetRole];
    if (form.floor) {
      hostelConds.push('floor = ?');
      hostelParams.push(form.floor);
    }
    const [cohort] = await pool.query(
      `SELECT id, name, email FROM users WHERE ${hostelConds.join(' AND ')} ORDER BY name ASC`,
      hostelParams
    );
    targetedCohort = cohort;
  } else {
    const [cohort] = await pool.query(
      `SELECT id, name, email
       FROM users
       WHERE role = ?
         AND (department_id = ? OR (department_id IS NULL AND LOWER(department) = LOWER(?)))
       ORDER BY name ASC`,
      [targetRole, form.department_id, form.department]
    );
    targetedCohort = cohort;
  }

  // 4. Fetch Submissions for this form
  // ONLY submission envelope metadata (id, student_id, submitted_at)
  // ABSOLUTELY NO question IDs, question text, ratings, options, or answer text are queried!
  const [submissions] = await pool.query(
    `SELECT id, student_id, submitted_at
     FROM form_submissions
     WHERE form_id = ?
     ORDER BY submitted_at ASC`,
    [formId]
  );

  // 5. Index submissions by student_id (holds respondent user ID)
  const submissionByUserId = new Map();
  let anonymousHistoricalCount = 0;

  for (const sub of submissions) {
    if (sub.student_id !== null && sub.student_id !== undefined) {
      submissionByUserId.set(sub.student_id, sub);
    } else {
      anonymousHistoricalCount++;
    }
  }

  // 6. Build Privacy-Preserving Participation Lists
  const respondents = [];
  const respondedList = [];
  const notRespondedList = [];

  for (const person of targetedCohort) {
    const sub = submissionByUserId.get(person.id);
    const hasResponded = Boolean(sub);

    const record = {
      studentId: person.id, // backwards-compatibility
      studentName: person.name, // backwards-compatibility
      userId: person.id,
      name: person.name,
      email: person.email,
      role: targetRole,
      status: hasResponded ? 'responded' : 'not_responded',
      submittedAt: hasResponded ? sub.submitted_at : null
    };

    respondents.push(record);
    if (hasResponded) {
      respondedList.push(record);
    } else {
      notRespondedList.push(record);
    }
  }

  // 7. Calculate Statistics safely (no division by zero)
  const targeted = targetedCohort.length;
  const responded = respondedList.length;
  const notResponded = notRespondedList.length;
  const responseRate = targeted > 0 ? Math.round((responded / targeted) * 100) : 0;

  return {
    success: true,
    data: {
      form: {
        id: form.id,
        title: form.title,
        description: form.description,
        targetAudience: form.target_audience || 'student',
        target_audience: form.target_audience || 'student',
        status: form.status,
        department: form.department,
        departmentId: form.department_id,
        targetAcademicYear: form.target_academic_year,
        targetSemester: form.target_semester,
        createdAt: form.created_at,
        closedAt: form.closed_at
      },
      stats: {
        targeted,
        responded,
        notResponded,
        responseRate,
        responseRateFormatted: `${responseRate}%`,
        totalSubmissions: submissions.length,
        anonymousHistoricalSubmissions: anonymousHistoricalCount
      },
      students: respondents,
      respondents,
      respondedList,
      notRespondedList
    }
  };
}

/**
 * 13. ANALYZE FORM (Phase 4: Collective AI Analysis)
 * Anonymous response aggregation directly from MySQL without exposing student identity.
 * Strictly checks HOD own department, draft rejection, 0 submissions rejection,
 * processing concurrency, structured question statistics, and AI output validation.
 */
async function analyzeForm(formId, user) {
  // 1. Fetch Form
  const [formRows] = await pool.query(
    `SELECT ff.*, d.name AS department_name
     FROM feedback_forms ff
     LEFT JOIN departments d ON ff.department_id = d.id
     WHERE ff.id = ?`,
    [formId]
  );

  if (formRows.length === 0) {
    return { notFound: true, message: `Form #${formId} not found.` };
  }

  const form = formRows[0];

  // 2. Authorization: Manager of form can trigger analysis
  if (!canUserManageForm(form, user)) {
    return {
      forbidden: true,
      message: 'Forbidden: You do not have permission to trigger AI analysis for this form.'
    };
  }

  // 3. Status checks: Draft forms cannot be analyzed
  if (form.status === 'draft') {
    return {
      errorType: 'BAD_REQUEST',
      message: 'Cannot analyze a draft form. The form must be published before analyzing responses.'
    };
  }

  // 4. Concurrency check: prevent simultaneous duplicate runs
  if (form.ai_status === 'processing') {
    return {
      errorType: 'CONFLICT',
      message: 'AI analysis is currently in progress for this form. Please wait until completion.'
    };
  }

  // 5. Check submissions: 0 responses cannot be analyzed
  const [subCountRows] = await pool.query(
    'SELECT COUNT(*) AS total FROM form_submissions WHERE form_id = ?',
    [formId]
  );
  const totalSubmissions = subCountRows[0]?.total || 0;
  if (totalSubmissions === 0) {
    return {
      errorType: 'BAD_REQUEST',
      message: 'No responses are available for analysis. Responses must be collected before triggering analysis.'
    };
  }

  // 6. Anonymous Response Aggregation
  // Query questions for this form
  const [questions] = await pool.query(
    `SELECT id, question_text, question_type, options, is_required, sort_order
     FROM form_questions
     WHERE form_id = ?
     ORDER BY sort_order ASC, id ASC`,
    [formId]
  );

  // Query answers without joining users or selecting student_id (Strict privacy preservation)
  const [answers] = await pool.query(
    `SELECT
       fa.question_id,
       fa.rating_value,
       fa.selected_option,
       fa.text_response
     FROM form_answers fa
     INNER JOIN form_submissions fs ON fa.submission_id = fs.id
     WHERE fs.form_id = ?`,
    [formId]
  );

  const answersByQuestion = new Map();
  for (const ans of answers) {
    if (!answersByQuestion.has(ans.question_id)) {
      answersByQuestion.set(ans.question_id, []);
    }
    answersByQuestion.get(ans.question_id).push(ans);
  }

  const questionStats = [];
  const textResponses = [];

  for (const q of questions) {
    const qAns = answersByQuestion.get(q.id) || [];
    let parsedOptions = [];
    if (q.options) {
      try {
        parsedOptions = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
      } catch (e) {
        parsedOptions = [];
      }
    }

    if (q.question_type === 'rating') {
      // Deterministic Rating Statistics
      const validRatings = qAns.filter(a => a.rating_value !== null && a.rating_value !== undefined);
      const count = validRatings.length;
      const sum = validRatings.reduce((acc, a) => acc + Number(a.rating_value), 0);
      const avg = count > 0 ? Number((sum / count).toFixed(2)) : 0;
      const distribution = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
      for (const a of validRatings) {
        const key = String(a.rating_value);
        if (distribution[key] !== undefined) distribution[key]++;
      }
      questionStats.push({
        questionId: q.id,
        questionText: q.question_text,
        questionType: 'rating',
        totalResponses: count,
        stats: {
          averageRating: avg,
          distribution
        }
      });
    } else if (q.question_type === 'mcq') {
      // Deterministic MCQ Statistics
      const validOpts = qAns.filter(a => a.selected_option !== null && a.selected_option !== undefined);
      const total = validOpts.length;
      const optionCounts = {};
      const optionPercentages = {};
      for (const opt of parsedOptions) {
        optionCounts[opt] = 0;
        optionPercentages[opt] = '0%';
      }
      for (const a of validOpts) {
        const opt = a.selected_option;
        optionCounts[opt] = (optionCounts[opt] || 0) + 1;
      }
      for (const opt of Object.keys(optionCounts)) {
        const pct = total > 0 ? Math.round((optionCounts[opt] / total) * 100) : 0;
        optionPercentages[opt] = `${pct}%`;
      }
      questionStats.push({
        questionId: q.id,
        questionText: q.question_text,
        questionType: 'mcq',
        totalResponses: total,
        stats: {
          optionCounts,
          optionPercentages
        }
      });
    } else if (q.question_type === 'yes_no') {
      // Deterministic Yes/No Statistics
      const validChoices = qAns.filter(a => a.selected_option !== null && a.selected_option !== undefined);
      const total = validChoices.length;
      let yesCount = 0;
      let noCount = 0;
      for (const a of validChoices) {
        const norm = String(a.selected_option).trim().toLowerCase();
        if (norm === 'yes') yesCount++;
        else if (norm === 'no') noCount++;
      }
      const yesPercentage = total > 0 ? Math.round((yesCount / total) * 100) : 0;
      const noPercentage = total > 0 ? Math.round((noCount / total) * 100) : 0;
      questionStats.push({
        questionId: q.id,
        questionText: q.question_text,
        questionType: 'yes_no',
        totalResponses: total,
        stats: {
          yesCount,
          noCount,
          yesPercentage: `${yesPercentage}%`,
          noPercentage: `${noPercentage}%`
        }
      });
    } else if (q.question_type === 'text') {
      // Text responses collected for themes, concerns, root-causes, and anonymous evidence
      const validTexts = qAns.filter(a => a.text_response && typeof a.text_response === 'string' && a.text_response.trim().length > 0);
      for (const a of validTexts) {
        textResponses.push({
          text: a.text_response.trim(),
          questionText: q.question_text
        });
      }
      questionStats.push({
        questionId: q.id,
        questionText: q.question_text,
        questionType: 'text',
        totalResponses: validTexts.length
      });
    }
  }

  // 7. Transition to processing state
  await pool.query(
    "UPDATE feedback_forms SET ai_status = 'processing', ai_error_message = NULL WHERE id = ?",
    [formId]
  );

  // 8. Execute Collective AI Analysis
  try {
    const analysis = await aiService.analyzeCollectiveFormResponses({
      department: form.department,
      formTitle: form.title,
      formDescription: form.description,
      targetAudience: form.target_audience || 'student',
      textResponses,
      questionStats,
      totalSubmissions
    });

    // 9. Validate AI Output
    const valCheck = aiService.validateCollectiveAnalysis(analysis);
    if (!valCheck.valid) {
      await pool.query(
        "UPDATE feedback_forms SET ai_status = 'failed', ai_error_message = ? WHERE id = ?",
        [valCheck.error, formId]
      );
      return {
        errorType: 'AI_VALIDATION_FAILED',
        message: `AI analysis output validation failed: ${valCheck.error}`
      };
    }

    const normalizedPriority = String(analysis.priority || 'medium').toLowerCase();
    const sentimentDistributionData = {
      sentiment: analysis.sentiment,
      themes: analysis.themes,
      questionStats,
      totalAnalyzed: totalSubmissions,
      provider: analysis.provider || 'fallback'
    };

    // 10. Persist results in Phase 1 database columns
    await pool.query(
      `UPDATE feedback_forms SET
         ai_summary = ?,
         ai_sentiment_distribution = ?,
         ai_primary_area = ?,
         ai_priority = ?,
         ai_status = 'completed',
         ai_analyzed_at = NOW(),
         ai_error_message = NULL
       WHERE id = ?`,
      [
        analysis.summary,
        JSON.stringify(sentimentDistributionData),
        analysis.primaryArea,
        normalizedPriority,
        formId
      ]
    );

    return {
      success: true,
      data: {
        status: 'completed',
        formId: form.id,
        formTitle: form.title,
        department: form.department,
        analyzedAt: new Date().toISOString(),
        summary: analysis.summary,
        primaryArea: analysis.primaryArea,
        priority: normalizedPriority.toUpperCase(),
        sentiment: analysis.sentiment,
        themes: analysis.themes,
        questionStats,
        totalAnalyzed: totalSubmissions,
        provider: analysis.provider || 'fallback'
      }
    };
  } catch (analysisErr) {
    const errMsg = analysisErr.message || 'AI collective analysis error.';
    await pool.query(
      "UPDATE feedback_forms SET ai_status = 'failed', ai_error_message = ? WHERE id = ?",
      [errMsg, formId]
    );
    return {
      errorType: 'AI_FAILED',
      message: `Analysis execution failed: ${errMsg}`
    };
  }
}

/**
 * 14. GET FORM ANALYSIS (Phase 4)
 * Retrieves completed or current AI collective analysis for a form.
 * HOD & Faculty: restricted to own department.
 * Management: institution-wide read-only.
 * Students: forbidden (403).
 */
async function getFormAnalysis(formId, user) {
  const [formRows] = await pool.query(
    `SELECT ff.*, d.name AS department_name
     FROM feedback_forms ff
     LEFT JOIN departments d ON ff.department_id = d.id
     WHERE ff.id = ?`,
    [formId]
  );

  if (formRows.length === 0) {
    return { notFound: true, message: `Form #${formId} not found.` };
  }

  const form = formRows[0];

  if (user.role === 'student') {
    return {
      forbidden: true,
      message: 'Forbidden: Students are not permitted to access collective AI analysis.'
    };
  }

  if (!canUserManageForm(form, user) && user.role !== 'faculty') {
    return {
      forbidden: true,
      message: 'Forbidden: You cannot access analysis for this form.'
    };
  }

  let parsedDist = null;
  if (form.ai_sentiment_distribution) {
    try {
      parsedDist = typeof form.ai_sentiment_distribution === 'string'
        ? JSON.parse(form.ai_sentiment_distribution)
        : form.ai_sentiment_distribution;
    } catch (e) {
      parsedDist = null;
    }
  }

  return {
    success: true,
    data: {
      status: form.ai_status || 'pending',
      formId: form.id,
      formTitle: form.title,
      department: form.department,
      analyzedAt: form.ai_analyzed_at,
      errorMessage: form.ai_error_message,
      summary: form.ai_summary,
      primaryArea: form.ai_primary_area,
      priority: form.ai_priority ? form.ai_priority.toUpperCase() : null,
      sentiment: parsedDist?.sentiment || null,
      themes: parsedDist?.themes || [],
      questionStats: parsedDist?.questionStats || [],
      totalAnalyzed: parsedDist?.totalAnalyzed || 0,
      provider: parsedDist?.provider || null
    }
  };
}

module.exports = {
  createForm,
  getForms,
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
