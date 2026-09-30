const { pool } = require('../config/db');
const { OFFICIAL_DEPARTMENTS, normalizeDepartment } = require('./analyticsService');
const { SUPPORTED_CATEGORIES } = require('./feedbackService');
const actionService = require('./actionService');

/**
 * Format recommendation database row to API response
 */
function formatRecommendation(row, updates = []) {
  return {
    id: String(row.id),
    recommendationCode: row.recommendation_code,
    issueId: String(row.issue_id),
    issueCode: row.issue_code || null,
    issueTitle: row.issue_title || null,
    department: row.department,
    title: row.title,
    justification: row.justification,
    category: row.category,
    priority: row.priority,
    estimatedCost: Number(row.estimated_cost || 0),
    createdBy: row.created_by,
    createdByName: row.created_by_name || 'HOD',
    status: row.status,
    reviewedBy: row.reviewed_by || null,
    reviewedByName: row.reviewed_by_name || null,
    reviewedAt: row.reviewed_at instanceof Date ? row.reviewed_at.toISOString() : (row.reviewed_at || null),
    reviewNotes: row.review_notes || null,
    actionId: row.action_id ? String(row.action_id) : null,
    actionCode: row.action_code || null,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
    updates
  };
}

/**
 * Format recommendation update row for audit trail
 */
function formatRecommendationUpdate(row) {
  return {
    id: String(row.id),
    recommendationId: String(row.recommendation_id),
    previousStatus: row.previous_status,
    newStatus: row.new_status,
    updateText: row.update_text,
    actorId: row.actor_id,
    actorName: row.actor_name,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at)
  };
}

/**
 * Create a new HOD recommendation
 */
async function createRecommendation({
  issueId,
  title,
  justification,
  category,
  priority = 'medium',
  estimatedCost = 0,
  user
}) {
  // 1. Role validation: ONLY HOD can create recommendations
  if (!user || user.role !== 'hod') {
    const error = new Error('Forbidden: Only HOD can create recommendations.');
    error.statusCode = 403;
    throw error;
  }

  // 2. Department presence check
  const userDept = user.department;
  if (!userDept) {
    const error = new Error('Forbidden: HOD profile does not have an assigned department.');
    error.statusCode = 403;
    throw error;
  }

  // 3. Issue validation: Must exist and belong to HOD's department
  const parsedIssueId = parseInt(issueId, 10);
  if (isNaN(parsedIssueId)) {
    const error = new Error('Valid issueId is required.');
    error.statusCode = 400;
    throw error;
  }

  const [issueRows] = await pool.query(
    'SELECT id, issue_code, title, department, category, priority FROM issues WHERE id = ?',
    [parsedIssueId]
  );

  if (issueRows.length === 0) {
    const error = new Error(`Issue #${parsedIssueId} not found.`);
    error.statusCode = 404;
    throw error;
  }

  const issue = issueRows[0];
  if (issue.department.toLowerCase() !== userDept.toLowerCase()) {
    const error = new Error(`Forbidden: HOD of "${userDept}" cannot recommend issue from "${issue.department}".`);
    error.statusCode = 403;
    throw error;
  }

  // 4. Validate fields
  if (!title || typeof title !== 'string' || title.trim().length < 3) {
    const error = new Error('Recommendation title is required and must be at least 3 characters.');
    error.statusCode = 400;
    throw error;
  }

  if (!justification || typeof justification !== 'string' || justification.trim().length < 5) {
    const error = new Error('Justification is required and must be at least 5 characters.');
    error.statusCode = 400;
    throw error;
  }

  const cleanCategory = category || issue.category || 'Other';
  const cleanPriority = (priority || issue.priority || 'medium').toLowerCase();
  const validPriorities = ['critical', 'high', 'medium', 'low'];
  if (!validPriorities.includes(cleanPriority)) {
    const error = new Error(`Invalid priority "${priority}". Must be one of: ${validPriorities.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }

  const cleanCost = Math.max(0, Number(estimatedCost) || 0);
  const recommendationCode = `REC-${Date.now().toString(36).toUpperCase()}`;

  // 5. Insert recommendation record
  const [result] = await pool.query(
    `INSERT INTO recommendations (
      recommendation_code, issue_id, department, title, justification,
      category, priority, estimated_cost, created_by, created_by_name, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [
      recommendationCode,
      parsedIssueId,
      userDept,
      title.trim(),
      justification.trim(),
      cleanCategory,
      cleanPriority,
      cleanCost,
      user.id,
      user.name || 'HOD'
    ]
  );

  const insertedId = result.insertId;

  // 6. Record initial audit trail entry
  await pool.query(
    `INSERT INTO recommendation_updates (
      recommendation_id, previous_status, new_status, update_text, actor_id, actor_name
    ) VALUES (?, NULL, 'pending', ?, ?, ?)`,
    [
      insertedId,
      `Recommendation submitted by ${user.name || 'HOD'} (${userDept})`,
      user.id,
      user.name || 'HOD'
    ]
  );

  return getRecommendationById({ id: insertedId, user });
}

/**
 * List recommendations with role-based and department isolation
 */
async function getRecommendations({
  user,
  department = null,
  status = null,
  priority = null,
  page = 1,
  limit = 20
}) {
  // 1. Role Authorization
  if (!user || user.role === 'student' || user.role === 'faculty') {
    const error = new Error(`Forbidden: ${user?.role === 'faculty' ? 'Faculty' : 'Students'} cannot access administrative recommendations.`);
    error.statusCode = 403;
    throw error;
  }

  const conditions = ['1=1'];
  const params = [];

  // 2. Department Scoping
  if (user.role === 'hod') {
    if (department && department.trim().toLowerCase() !== user.department.toLowerCase()) {
      const error = new Error(`Forbidden: HOD of "${user.department}" cannot access recommendations from "${department}".`);
      error.statusCode = 403;
      throw error;
    }
    conditions.push('LOWER(r.department) = LOWER(?)');
    params.push(user.department);
  } else if (user.role === 'management') {
    if (department && department.trim() && department.toLowerCase() !== 'all') {
      const matched = OFFICIAL_DEPARTMENTS.find(d => d.toLowerCase() === department.trim().toLowerCase());
      if (!matched) {
        const error = new Error(`Invalid department "${department}". Must be one of: ${OFFICIAL_DEPARTMENTS.join(', ')}.`);
        error.statusCode = 400;
        throw error;
      }
      conditions.push('LOWER(r.department) = LOWER(?)');
      params.push(matched);
    }
  }

  // 3. Status filter
  if (status && status.trim() && status.toLowerCase() !== 'all') {
    const validStatuses = ['pending', 'approved', 'rejected', 'deferred'];
    const cleanStatus = status.trim().toLowerCase();
    if (!validStatuses.includes(cleanStatus)) {
      const error = new Error(`Invalid status "${status}". Must be one of: ${validStatuses.join(', ')}`);
      error.statusCode = 400;
      throw error;
    }
    conditions.push('r.status = ?');
    params.push(cleanStatus);
  }

  // 4. Priority filter
  if (priority && priority.trim() && priority.toLowerCase() !== 'all') {
    conditions.push('r.priority = ?');
    params.push(priority.trim().toLowerCase());
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  // 5. Total count
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM recommendations r ${whereClause}`,
    params
  );
  const total = countRows[0].total;

  // 6. Pagination
  const validPage = Math.max(1, parseInt(page, 10) || 1);
  const validLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (validPage - 1) * validLimit;
  const totalPages = Math.ceil(total / validLimit) || 1;

  // 7. Fetch records with joined issue and action info
  const queryParams = [...params, validLimit, offset];
  const [rows] = await pool.query(
    `SELECT 
      r.*,
      i.issue_code,
      i.title AS issue_title,
      a.action_code
    FROM recommendations r
    LEFT JOIN issues i ON r.issue_id = i.id
    LEFT JOIN actions a ON r.action_id = a.id
    ${whereClause}
    ORDER BY 
      CASE r.status WHEN 'pending' THEN 1 WHEN 'approved' THEN 2 WHEN 'deferred' THEN 3 ELSE 4 END,
      r.created_at DESC
    LIMIT ? OFFSET ?`,
    queryParams
  );

  // 8. Aggregate status summary stats
  const statDeptCondition = user.role === 'hod' ? 'WHERE LOWER(department) = LOWER(?)' : (department && department.toLowerCase() !== 'all' ? 'WHERE LOWER(department) = LOWER(?)' : '');
  const statDeptParams = user.role === 'hod' ? [user.department] : (department && department.toLowerCase() !== 'all' ? [department] : []);

  const [statRows] = await pool.query(
    `SELECT 
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected,
      SUM(CASE WHEN status = 'deferred' THEN 1 ELSE 0 END) AS deferred
    FROM recommendations
    ${statDeptCondition}`,
    statDeptParams
  );

  const statsRaw = statRows[0] || {};
  const stats = {
    total: Number(statsRaw.total) || 0,
    pending: Number(statsRaw.pending) || 0,
    approved: Number(statsRaw.approved) || 0,
    rejected: Number(statsRaw.rejected) || 0,
    deferred: Number(statsRaw.deferred) || 0
  };

  const formattedRecommendations = rows.map(r => formatRecommendation(r));

  return {
    recommendations: formattedRecommendations,
    stats,
    pagination: {
      page: validPage,
      limit: validLimit,
      total,
      totalPages
    }
  };
}

/**
 * Retrieve single recommendation with audit trail updates
 */
async function getRecommendationById({ id, user }) {
  // 1. Role validation
  if (!user || user.role === 'student' || user.role === 'faculty') {
    const error = new Error(`Forbidden: ${user?.role === 'faculty' ? 'Faculty' : 'Students'} cannot access administrative recommendations.`);
    error.statusCode = 403;
    throw error;
  }

  const parsedId = parseInt(id, 10);
  if (isNaN(parsedId)) {
    const error = new Error('Invalid recommendation ID.');
    error.statusCode = 400;
    throw error;
  }

  const [rows] = await pool.query(
    `SELECT 
      r.*,
      i.issue_code,
      i.title AS issue_title,
      a.action_code
    FROM recommendations r
    LEFT JOIN issues i ON r.issue_id = i.id
    LEFT JOIN actions a ON r.action_id = a.id
    WHERE r.id = ?`,
    [parsedId]
  );

  if (rows.length === 0) {
    const error = new Error(`Recommendation #${parsedId} not found.`);
    error.statusCode = 404;
    throw error;
  }

  const record = rows[0];

  // 2. Department boundary enforcement for HOD
  if (user.role === 'hod') {
    if (record.department.toLowerCase() !== user.department.toLowerCase()) {
      const error = new Error(`Forbidden: HOD of "${user.department}" cannot access recommendation from "${record.department}".`);
      error.statusCode = 403;
      throw error;
    }
  }

  // 3. Fetch chronological audit updates
  const [updateRows] = await pool.query(
    'SELECT * FROM recommendation_updates WHERE recommendation_id = ? ORDER BY created_at ASC',
    [parsedId]
  );

  const updates = updateRows.map(formatRecommendationUpdate);
  return formatRecommendation(record, updates);
}

/**
 * Management reviews recommendation (approve, reject, defer)
 */
async function reviewRecommendation({
  id,
  decision,
  reviewNotes = '',
  assignedTo = null,
  targetCompletionDate = null,
  createAction = false,
  user
}) {
  // 1. Role validation: ONLY Management can review recommendations
  if (!user || user.role !== 'management') {
    const error = new Error('Forbidden: Only Management can review recommendations.');
    error.statusCode = 403;
    throw error;
  }

  const parsedId = parseInt(id, 10);
  if (isNaN(parsedId)) {
    const error = new Error('Invalid recommendation ID.');
    error.statusCode = 400;
    throw error;
  }

  // 2. Decision validation
  const validDecisions = ['approved', 'rejected', 'deferred'];
  const cleanDecision = (decision || '').trim().toLowerCase();
  if (!validDecisions.includes(cleanDecision)) {
    const error = new Error(`Invalid decision "${decision}". Must be one of: ${validDecisions.join(', ')}.`);
    error.statusCode = 400;
    throw error;
  }

  // 3. Fetch existing recommendation
  const [rows] = await pool.query('SELECT * FROM recommendations WHERE id = ?', [parsedId]);
  if (rows.length === 0) {
    const error = new Error(`Recommendation #${parsedId} not found.`);
    error.statusCode = 404;
    throw error;
  }

  const current = rows[0];
  const previousStatus = current.status;

  // 4. Update recommendation record
  await pool.query(
    `UPDATE recommendations SET
      status = ?,
      reviewed_by = ?,
      reviewed_by_name = ?,
      reviewed_at = CURRENT_TIMESTAMP,
      review_notes = ?
    WHERE id = ?`,
    [
      cleanDecision,
      user.id,
      user.name || 'Management',
      reviewNotes ? reviewNotes.trim() : null,
      parsedId
    ]
  );

  // 5. Record audit update
  const auditNote = reviewNotes && reviewNotes.trim()
    ? `Management decision: ${cleanDecision.toUpperCase()}. Notes: ${reviewNotes.trim()}`
    : `Management decision: ${cleanDecision.toUpperCase()}`;

  await pool.query(
    `INSERT INTO recommendation_updates (
      recommendation_id, previous_status, new_status, update_text, actor_id, actor_name
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      parsedId,
      previousStatus,
      cleanDecision,
      auditNote,
      user.id,
      user.name || 'Management'
    ]
  );

  // 6. If approved and createAction requested, automatically convert to action
  let createdAction = null;
  if (cleanDecision === 'approved' && createAction) {
    createdAction = await convertApprovedToAction({
      id: parsedId,
      actionData: {
        assignedTo,
        dueDate: targetCompletionDate,
        notes: reviewNotes
      },
      user
    });
  }

  const updatedRec = await getRecommendationById({ id: parsedId, user });
  return {
    recommendation: updatedRec,
    action: createdAction ? createdAction.action : null
  };
}

/**
 * Convert an approved recommendation into an institution action
 */
async function convertApprovedToAction({ id, actionData = {}, user }) {
  // 1. Role validation: ONLY Management can convert recommendations into actions
  if (!user || user.role !== 'management') {
    const error = new Error('Forbidden: Only Management can convert recommendations into actions.');
    error.statusCode = 403;
    throw error;
  }

  const parsedId = parseInt(id, 10);
  if (isNaN(parsedId)) {
    const error = new Error('Invalid recommendation ID.');
    error.statusCode = 400;
    throw error;
  }

  // 2. Fetch recommendation
  const [rows] = await pool.query('SELECT * FROM recommendations WHERE id = ?', [parsedId]);
  if (rows.length === 0) {
    const error = new Error(`Recommendation #${parsedId} not found.`);
    error.statusCode = 404;
    throw error;
  }

  const rec = rows[0];

  // 3. Status validation
  if (rec.status !== 'approved') {
    const error = new Error(`Cannot convert recommendation with status "${rec.status}" to an action. Recommendation must be "approved" first.`);
    error.statusCode = 400;
    throw error;
  }

  // 4. Duplicate action prevention
  if (rec.action_id) {
    const error = new Error(`An action (#${rec.action_id}) has already been created for this recommendation.`);
    error.statusCode = 400;
    throw error;
  }

  // 5. Create Management Action via existing actionService
  const cleanDueDate = actionData.dueDate || actionData.targetCompletionDate || actionData.deadline || null;
  const newAction = await actionService.createAction(
    {
      title: actionData.title || rec.title,
      description: actionData.description || `Institution action created from approved HOD Recommendation [${rec.recommendation_code}]: ${rec.justification}`,
      department: rec.department,
      issueId: rec.issue_id,
      priority: actionData.priority || rec.priority,
      status: actionData.status || 'planned',
      assignedTo: actionData.assignedTo || 'Director of Campus Infrastructure',
      dueDate: cleanDueDate,
      estimatedCost: Number(actionData.estimatedCost || actionData.costEstimate || rec.estimated_cost || 0),
      notes: actionData.notes || (rec.review_notes ? `Review notes: ${rec.review_notes}` : null),
      updateText: `Institution action created by Management from approved Recommendation ${rec.recommendation_code}`
    },
    user
  );

  // 6. Link action_id in recommendation
  await pool.query(
    'UPDATE recommendations SET action_id = ? WHERE id = ?',
    [newAction.id, parsedId]
  );

  // 7. Audit trail update on recommendation
  await pool.query(
    `INSERT INTO recommendation_updates (
      recommendation_id, previous_status, new_status, update_text, actor_id, actor_name
    ) VALUES (?, 'approved', 'approved', ?, ?, ?)`,
    [
      parsedId,
      `Converted to institution action #${newAction.id} (${newAction.actionCode}) by Management`,
      user.id,
      user.name || 'Management'
    ]
  );

  const updatedRec = await getRecommendationById({ id: parsedId, user });
  return {
    recommendation: updatedRec,
    action: newAction
  };
}

module.exports = {
  createRecommendation,
  getRecommendations,
  getRecommendationById,
  reviewRecommendation,
  convertApprovedToAction,
  formatRecommendation
};
