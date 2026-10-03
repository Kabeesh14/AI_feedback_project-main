const { pool } = require('../config/db');
const { OFFICIAL_DEPARTMENTS, normalizeDepartment } = require('./analyticsService');
const { buildBusNumberSql, isMatchingBus } = require('../utils/busUtils');

/**
 * Format database row to Action API contract with compatibility aliases
 */
function formatAction(row, updates = [], impact = null) {
  let dueDateStr = null;
  if (row.due_date instanceof Date) {
    const y = row.due_date.getFullYear();
    const m = String(row.due_date.getMonth() + 1).padStart(2, '0');
    const d = String(row.due_date.getDate()).padStart(2, '0');
    dueDateStr = `${y}-${m}-${d}`;
  } else if (row.due_date) {
    dueDateStr = String(row.due_date).slice(0, 10);
  }
  return {
    id: String(row.id),
    actionCode: row.action_code,
    title: row.title,
    action: row.title, // alias for frontend Action type
    description: row.description || '',
    issueId: row.issue_id ? String(row.issue_id) : null,
    issueTitle: row.issue_title || null,
    possibleCause: row.possible_cause || 'Under investigation',
    alertId: row.alert_id ? String(row.alert_id) : null,
    department: row.department,
    portal: row.portal || 'education',
    bus_number: row.bus_number || null,
    floor: row.floor || null,
    assignedTo: row.assigned_to || 'Unassigned',
    priority: row.priority,
    severity: row.priority,
    status: row.status,
    dueDate: dueDateStr,
    deadline: dueDateStr, // alias for frontend Action type
    completedAt: row.completed_at instanceof Date ? row.completed_at.toISOString() : (row.completed_at || null),
    estimatedCost: Number(row.cost_estimate || 0),
    costEstimate: Number(row.cost_estimate || 0),
    notes: row.notes || null,
    completionNotes: row.completion_notes || null,
    resolutionNotes: row.resolution_notes || null,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
    impact,
    updates
  };
}

/**
 * Format action_updates audit row
 */
function formatUpdate(row) {
  return {
    id: String(row.id),
    actionId: String(row.action_id),
    updateText: row.update_text,
    previousStatus: row.previous_status,
    newStatus: row.new_status,
    createdBy: row.created_by,
    userId: row.user_id,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at)
  };
}

/**
 * Create a new corrective action
 */
async function createAction(data, user) {
  const {
    title,
    action: altTitle,
    description = '',
    issueId = null,
    alertId = null,
    assignedTo = null,
    priority = 'medium',
    status = 'planned',
    dueDate = null,
    deadline = null,
    estimatedCost = 0,
    costEstimate = 0,
    notes = null,
    updateText = null
  } = data;

  const rawTitle = title || altTitle;
  if (!rawTitle || typeof rawTitle !== 'string' || rawTitle.trim().length < 3) {
    throw new Error('Action title is required and must be at least 3 characters.');
  }

  const validPriorities = ['critical', 'high', 'medium', 'low'];
  const cleanPriority = (priority || 'medium').toLowerCase();
  if (!validPriorities.includes(cleanPriority)) {
    throw new Error(`Invalid priority "${priority}". Must be one of: ${validPriorities.join(', ')}`);
  }

  const validStatuses = ['planned', 'pending', 'in_progress', 'completed', 'overdue', 'cancelled'];
  const cleanStatus = (status || 'planned').toLowerCase();
  if (!validStatuses.includes(cleanStatus)) {
    throw new Error(`Invalid status "${status}". Must be one of: ${validStatuses.join(', ')}`);
  }

  // Portal, Department, and Scope assignment
  let portal = 'education';
  let department = null;
  let busNumber = null;
  let floor = null;

  if (user.role === 'bus_incharge') {
    portal = 'bus';
    busNumber = user.bus_number;
    department = null;
  } else if (user.role === 'transport_incharge') {
    portal = 'bus';
    busNumber = data.bus_number || data.busNumber || null;
    department = null;
  } else if (user.role === 'hostel_warden') {
    portal = 'hostel';
    floor = user.assigned_floor;
    department = null;
  } else if (user.role === 'hod') {
    portal = 'education';
    department = user.department;
  } else if (user.role === 'management') {
    portal = (data.portal || 'education').toLowerCase();
    if (portal === 'bus') {
      busNumber = data.bus_number || data.busNumber || null;
    } else if (portal === 'hostel') {
      floor = data.floor || null;
    } else {
      department = normalizeDepartment(data.department);
      if (!department) {
        throw new Error(`Invalid or missing department. Must be one of: ${OFFICIAL_DEPARTMENTS.join(', ')}`);
      }
    }
  } else {
    department = normalizeDepartment(data.department);
    if (!department) {
      throw new Error(`Invalid or missing department. Must be one of: ${OFFICIAL_DEPARTMENTS.join(', ')}`);
    }
  }

  const cleanDueDate = dueDate || deadline || null;
  const cleanCost = Number(estimatedCost || costEstimate) || 0;
  const actionCode = `ACT-${Math.floor(1000 + Math.random() * 9000)}`;

  // Insert action record
  const [result] = await pool.query(`
    INSERT INTO actions (
      action_code, issue_id, alert_id, title, description,
      department, assigned_to, priority, status, due_date,
      cost_estimate, notes, portal, bus_number, floor
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    actionCode,
    issueId || null,
    alertId || null,
    rawTitle.trim(),
    description,
    department,
    assignedTo || 'Unassigned',
    cleanPriority,
    cleanStatus,
    cleanDueDate,
    cleanCost,
    notes,
    portal,
    busNumber,
    floor
  ]);

  const newActionId = result.insertId;

  // Update issue status if linked
  if (issueId) {
    await pool.query(`
      UPDATE issues 
      SET status = CASE 
        WHEN status IN ('identified', 'investigating') THEN 'action_planned' 
        ELSE status 
      END
      WHERE id = ?
    `, [issueId]);
  }

  // Write initial progress update in action_updates audit trail
  const initialUpdate = updateText || `Action created and assigned to ${assignedTo || 'Unassigned'}.`;
  await pool.query(`
    INSERT INTO action_updates (
      action_id, update_text, previous_status, new_status, created_by, user_id
    ) VALUES (?, ?, NULL, ?, ?, ?)
  `, [
    newActionId,
    initialUpdate,
    cleanStatus,
    user.name || 'System User',
    user.id || null
  ]);

  return getActionById(newActionId, user.role === 'hod' ? department : null);
}

/**
 * Get actions with role/department scoping and stats
 */
async function getActions(department = null, filters = {}) {
  const normDept = normalizeDepartment(department);
  let where = 'WHERE 1=1';
  const params = [];

  if (normDept) {
    where += ' AND a.department = ?';
    params.push(normDept);
  }

  if (filters.portal) {
    where += ' AND a.portal = ?';
    params.push(filters.portal);
  }

  if (filters.bus_number && String(filters.bus_number).toUpperCase() !== 'ALL') {
    const { clause, params: bParams } = buildBusNumberSql('a.bus_number', filters.bus_number);
    where += ` AND ${clause}`;
    params.push(...bParams);
  }

  if (filters.floor) {
    where += ' AND a.floor = ?';
    params.push(filters.floor);
  }

  if (filters.status) {
    where += ' AND a.status = ?';
    params.push(filters.status);
  }

  if (filters.priority) {
    where += ' AND a.priority = ?';
    params.push(filters.priority);
  }

  if (filters.issueId) {
    where += ' AND a.issue_id = ?';
    params.push(filters.issueId);
  }

  const [rows] = await pool.query(`
    SELECT 
      a.*,
      i.title AS issue_title,
      i.root_cause AS possible_cause
    FROM actions a
    LEFT JOIN issues i ON a.issue_id = i.id
    ${where}
    ORDER BY 
      CASE a.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
      a.created_at DESC
  `, params);

  // Compute action stats
  let statWhere = 'WHERE 1=1';
  const statParams = [];
  if (normDept) {
    statWhere += ' AND department = ?';
    statParams.push(normDept);
  }
  if (filters.portal) {
    statWhere += ' AND portal = ?';
    statParams.push(filters.portal);
  }
  if (filters.bus_number && String(filters.bus_number).toUpperCase() !== 'ALL') {
    const { clause, params: bParams } = buildBusNumberSql('bus_number', filters.bus_number);
    statWhere += ` AND ${clause}`;
    statParams.push(...bParams);
  }
  if (filters.floor) {
    statWhere += ' AND floor = ?';
    statParams.push(filters.floor);
  }

  const [statRows] = await pool.query(`
    SELECT 
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'planned' THEN 1 ELSE 0 END) AS planned,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS inProgress,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
      SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) AS overdue
    FROM actions
    ${statWhere}
  `, statParams);

  const statsRaw = statRows[0] || {};
  const stats = {
    total: Number(statsRaw.total) || 0,
    planned: Number(statsRaw.planned) || 0,
    inProgress: Number(statsRaw.inProgress) || 0,
    completed: Number(statsRaw.completed) || 0,
    overdue: Number(statsRaw.overdue) || 0,
    withImpact: Number(statsRaw.completed) || 0,
    avgImprovement: null
  };

  const actions = rows.map(r => formatAction(r));

  return {
    department: normDept || (filters.portal === 'bus' ? (filters.bus_number || 'All Buses') : filters.portal === 'hostel' ? (filters.floor || 'All Floors') : 'All Departments'),
    stats,
    actions
  };
}

/**
 * Get single action by ID with audit trail updates
 */
async function getActionById(id, department = null) {
  const normDept = normalizeDepartment(department);
  let sql = `
    SELECT 
      a.*,
      i.title AS issue_title,
      i.root_cause AS possible_cause
    FROM actions a
    LEFT JOIN issues i ON a.issue_id = i.id
    WHERE a.id = ?
  `;
  const params = [id];

  if (normDept) {
    sql += ' AND a.department = ?';
    params.push(normDept);
  }

  const [rows] = await pool.query(sql, params);
  if (rows.length === 0) return null;

  // Fetch audit trail updates
  const [updateRows] = await pool.query(`
    SELECT * FROM action_updates
    WHERE action_id = ?
    ORDER BY created_at ASC
  `, [id]);

  const updates = updateRows.map(formatUpdate);

  // Real impact is evaluated dynamically via impactService; do not inject hardcoded fallbacks
  const impact = null;

  return formatAction(rows[0], updates, impact);
}

/**
 * Update an action
 */
async function updateAction(id, updates, user) {
  const deptFilter = user.role === 'hod' ? user.department : null;
  const existing = await getActionById(id, deptFilter);
  if (!existing) return null;

  const validStatuses = ['planned', 'pending', 'in_progress', 'completed', 'overdue', 'cancelled'];
  const validPriorities = ['critical', 'high', 'medium', 'low'];

  const prevStatus = existing.status;
  const newStatus = updates.status ? updates.status.toLowerCase() : prevStatus;
  if (updates.status && !validStatuses.includes(newStatus)) {
    throw new Error(`Invalid status "${updates.status}". Must be one of: ${validStatuses.join(', ')}`);
  }

  const newPriority = updates.priority ? updates.priority.toLowerCase() : existing.priority;
  if (updates.priority && !validPriorities.includes(newPriority)) {
    throw new Error(`Invalid priority "${updates.priority}". Must be one of: ${validPriorities.join(', ')}`);
  }

  const title = updates.title || updates.action || existing.title;
  const description = updates.description !== undefined ? updates.description : existing.description;
  const assignedTo = updates.assignedTo !== undefined ? updates.assignedTo : existing.assignedTo;
  const dueDate = updates.dueDate || updates.deadline || existing.dueDate;
  const cost = updates.estimatedCost !== undefined ? Number(updates.estimatedCost) : existing.estimatedCost;
  const notes = updates.notes !== undefined ? updates.notes : existing.notes;
  const completionNotes = updates.completionNotes !== undefined ? updates.completionNotes : existing.completionNotes;
  const resolutionNotes = updates.resolutionNotes !== undefined ? updates.resolutionNotes : existing.resolutionNotes;

  const statusChanged = prevStatus !== newStatus;
  const completedAt = (newStatus === 'completed' && !existing.completedAt) ? new Date() : (newStatus === 'completed' ? existing.completedAt : null);

  await pool.query(`
    UPDATE actions SET
      title = ?,
      description = ?,
      assigned_to = ?,
      priority = ?,
      status = ?,
      due_date = ?,
      cost_estimate = ?,
      notes = ?,
      completion_notes = ?,
      resolution_notes = ?,
      completed_at = ?
    WHERE id = ?
  `, [
    title,
    description,
    assignedTo,
    newPriority,
    newStatus,
    dueDate,
    cost,
    notes,
    completionNotes,
    resolutionNotes,
    completedAt,
    id
  ]);

  // If status changed or update text provided, record audit trail
  if (statusChanged || updates.updateText) {
    const text = updates.updateText || `Status updated from "${prevStatus}" to "${newStatus}".`;
    await pool.query(`
      INSERT INTO action_updates (
        action_id, update_text, previous_status, new_status, created_by, user_id
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      id,
      text,
      prevStatus,
      newStatus,
      user.name || 'User',
      user.id || null
    ]);
  }

  // If completed and issue linked, update issue status
  if (newStatus === 'completed' && existing.issueId) {
    await pool.query(`
      UPDATE issues 
      SET status = 'resolved', resolved_at = NOW()
      WHERE id = ?
    `, [existing.issueId]);
  } else if (newStatus === 'in_progress' && existing.issueId) {
    await pool.query(`
      UPDATE issues 
      SET status = 'action_planned'
      WHERE id = ? AND status IN ('identified', 'investigating', 'resolved')
    `, [existing.issueId]);
  } else if ((newStatus === 'pending' || newStatus === 'planned') && existing.issueId) {
    await pool.query(`
      UPDATE issues 
      SET status = 'action_planned'
      WHERE id = ? AND status IN ('identified', 'investigating', 'resolved')
    `, [existing.issueId]);
  }

  return getActionById(id, deptFilter);
}

/**
 * Delete an action
 */
async function deleteAction(id, department = null) {
  const normDept = normalizeDepartment(department);
  const existing = await getActionById(id, normDept);
  if (!existing) return null;

  const [result] = await pool.query('DELETE FROM actions WHERE id = ?', [id]);
  return { success: result.affectedRows > 0 };
}

/**
 * Add an audit update to an action
 */
async function addActionUpdate(id, updateText, newStatus = null, user) {
  if (!updateText || typeof updateText !== 'string' || updateText.trim().length === 0) {
    throw new Error('Update text is required.');
  }

  const deptFilter = user.role === 'hod' ? user.department : null;
  const action = await getActionById(id, deptFilter);
  if (!action) return null;

  let currentStatus = action.status;
  if (newStatus && newStatus !== currentStatus) {
    await updateAction(id, { status: newStatus, updateText }, user);
    return getActionById(id, deptFilter);
  }

  const [result] = await pool.query(`
    INSERT INTO action_updates (
      action_id, update_text, previous_status, new_status, created_by, user_id
    ) VALUES (?, ?, ?, ?, ?, ?)
  `, [
    id,
    updateText.trim(),
    currentStatus,
    currentStatus,
    user.name || 'User',
    user.id || null
  ]);

  const [rows] = await pool.query('SELECT * FROM action_updates WHERE id = ?', [result.insertId]);
  return formatUpdate(rows[0]);
}

module.exports = {
  formatAction,
  formatUpdate,
  createAction,
  getActions,
  getActionById,
  updateAction,
  deleteAction,
  addActionUpdate
};
