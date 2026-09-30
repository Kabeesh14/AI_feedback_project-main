const { pool } = require('../config/db');
const { OFFICIAL_DEPARTMENTS, normalizeDepartment } = require('./analyticsService');

/**
 * Format database row to Alert API contract
 */
function formatAlert(row) {
  const isRead = Boolean(row.is_read || row.status === 'read' || row.status === 'acknowledged' || row.status === 'resolved');
  return {
    id: String(row.id),
    type: row.type,
    title: row.title,
    message: row.message,
    severity: row.severity || 'info',
    department: row.department || 'ALL',
    issueId: row.issue_id ? String(row.issue_id) : null,
    issueTitle: row.issue_title || null,
    status: row.status || (isRead ? 'read' : 'new'),
    isRead,
    read: isRead,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    timestamp: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    readAt: row.read_at instanceof Date ? row.read_at.toISOString() : row.read_at,
    acknowledgedAt: row.acknowledged_at instanceof Date ? row.acknowledged_at.toISOString() : row.acknowledged_at,
    resolvedAt: row.resolved_at instanceof Date ? row.resolved_at.toISOString() : row.resolved_at
  };
}

/**
 * Check and generate alerts based on actual database conditions
 * Enforces strict deduplication logic to prevent duplicate alerts.
 */
async function checkAndGenerateAlerts(department = null) {
  const normDept = normalizeDepartment(department);
  const deptClause = normDept ? ' AND department = ?' : '';
  const deptParams = normDept ? [normDept] : [];

  const createdAlerts = [];

  // Helper: check if active alert already exists (deduplication)
  async function alertExists(type, issueId = null, dept = null) {
    if (issueId) {
      const [rows] = await pool.query(`
        SELECT id FROM alerts 
        WHERE type = ? AND issue_id = ? AND status NOT IN ('resolved', 'dismissed')
      `, [type, issueId]);
      return rows.length > 0;
    } else {
      const [rows] = await pool.query(`
        SELECT id FROM alerts 
        WHERE type = ? AND department = ? AND issue_id IS NULL 
          AND (status NOT IN ('resolved', 'dismissed') OR created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR))
      `, [type, dept || 'ALL']);
      return rows.length > 0;
    }
  }

  // 1. Critical Priority Issues
  const [criticalIssues] = await pool.query(`
    SELECT id, issue_code, title, department, priority, status, feedback_count
    FROM issues
    WHERE priority = 'critical' AND status != 'resolved' ${deptClause}
  `, deptParams);

  for (const issue of criticalIssues) {
    const exists = await alertExists('critical_issue', issue.id);
    if (!exists) {
      const [result] = await pool.query(`
        INSERT INTO alerts (type, severity, department, issue_id, title, message, status)
        VALUES (?, 'critical', ?, ?, ?, ?, 'new')
      `, [
        'critical_issue',
        issue.department,
        issue.id,
        `Critical Priority Issue: ${issue.title}`,
        `Issue "${issue.title}" (${issue.issue_code}) in ${issue.department} has reached critical severity.`
      ]);
      createdAlerts.push(result.insertId);
    }
  }

  // 2. High Priority Issues
  const [highIssues] = await pool.query(`
    SELECT id, issue_code, title, department, priority, status, feedback_count
    FROM issues
    WHERE priority = 'high' AND status != 'resolved' ${deptClause}
  `, deptParams);

  for (const issue of highIssues) {
    const exists = await alertExists('high_priority_issue', issue.id);
    if (!exists) {
      const [result] = await pool.query(`
        INSERT INTO alerts (type, severity, department, issue_id, title, message, status)
        VALUES (?, 'warning', ?, ?, ?, ?, 'new')
      `, [
        'high_priority_issue',
        issue.department,
        issue.id,
        `High Priority Issue: ${issue.title}`,
        `High priority concern flagged in ${issue.department}: "${issue.title}". Needs departmental review.`
      ]);
      createdAlerts.push(result.insertId);
    }
  }

  // 3. Emerging Issues
  const [emergingIssues] = await pool.query(`
    SELECT id, issue_code, title, department, emerging_reason, status
    FROM issues
    WHERE is_emerging = 1 AND status != 'resolved' ${deptClause}
  `, deptParams);

  for (const issue of emergingIssues) {
    const exists = await alertExists('emerging_issue', issue.id);
    if (!exists) {
      const [result] = await pool.query(`
        INSERT INTO alerts (type, severity, department, issue_id, title, message, status)
        VALUES (?, 'warning', ?, ?, ?, ?, 'new')
      `, [
        'emerging_issue',
        issue.department,
        issue.id,
        `Emerging Issue Trend: ${issue.title}`,
        issue.emerging_reason || `Rapid influx of student complaints detected for "${issue.title}".`
      ]);
      createdAlerts.push(result.insertId);
    }
  }

  // 4. Complaint Spike (>= 5 complaints for an issue in 48 hours)
  const [spikeIssues] = await pool.query(`
    SELECT f.issue_id, i.title, i.department, COUNT(*) AS recent_count
    FROM feedback f
    JOIN issues i ON f.issue_id = i.id
    WHERE f.created_at >= DATE_SUB(NOW(), INTERVAL 48 HOUR)
      AND i.status != 'resolved' ${normDept ? 'AND i.department = ?' : ''}
    GROUP BY f.issue_id, i.title, i.department
    HAVING recent_count >= 5
  `, deptParams);

  for (const spike of spikeIssues) {
    const exists = await alertExists('complaint_spike', spike.issue_id);
    if (!exists) {
      const [result] = await pool.query(`
        INSERT INTO alerts (type, severity, department, issue_id, title, message, status)
        VALUES (?, 'critical', ?, ?, ?, ?, 'new')
      `, [
        'complaint_spike',
        spike.department,
        spike.issue_id,
        `Complaint Surge: ${spike.title}`,
        `High complaint velocity: ${spike.recent_count} feedback submissions logged within 48 hours for "${spike.title}".`
      ]);
      createdAlerts.push(result.insertId);
    }
  }

  // 5. Sentiment Drop (Department negative sentiment > 40% with >= 3 responses)
  const [deptSentiment] = await pool.query(`
    SELECT 
      department,
      COUNT(*) AS total,
      SUM(CASE WHEN sentiment = 'negative' THEN 1 ELSE 0 END) AS negCount
    FROM feedback
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) ${deptClause}
    GROUP BY department
    HAVING total >= 3 AND (negCount / total) > 0.40
  `, deptParams);

  for (const ds of deptSentiment) {
    const negPct = Math.round((ds.negCount / ds.total) * 100);
    const exists = await alertExists('sentiment_drop', null, ds.department);
    if (!exists) {
      const [result] = await pool.query(`
        INSERT INTO alerts (type, severity, department, issue_id, title, message, status)
        VALUES (?, 'warning', ?, NULL, ?, ?, 'new')
      `, [
        'sentiment_drop',
        ds.department,
        `Negative Sentiment Surge in ${ds.department}`,
        `Negative feedback reached ${negPct}% (${ds.negCount}/${ds.total} submissions) over the last 7 days in ${ds.department}.`
      ]);
      createdAlerts.push(result.insertId);
    }
  }

  // 6. Unresolved Issue (Target date passed and not resolved)
  const [unresolvedIssues] = await pool.query(`
    SELECT id, issue_code, title, department, target_resolution_date, status
    FROM issues
    WHERE target_resolution_date IS NOT NULL 
      AND target_resolution_date < CURDATE() 
      AND status != 'resolved' ${deptClause}
  `, deptParams);

  for (const issue of unresolvedIssues) {
    const exists = await alertExists('unresolved_issue', issue.id);
    if (!exists) {
      const [result] = await pool.query(`
        INSERT INTO alerts (type, severity, department, issue_id, title, message, status)
        VALUES (?, 'warning', ?, ?, ?, ?, 'new')
      `, [
        'unresolved_issue',
        issue.department,
        issue.id,
        `SLA Overdue: ${issue.title}`,
        `Target resolution date (${issue.target_resolution_date instanceof Date ? issue.target_resolution_date.toISOString().slice(0, 10) : issue.target_resolution_date}) has elapsed for "${issue.title}".`
      ]);
      createdAlerts.push(result.insertId);
    }
  }

  // 7. Recurring Issue (accumulated feedback count >= 8)
  const [recurringIssues] = await pool.query(`
    SELECT id, issue_code, title, department, feedback_count, status
    FROM issues
    WHERE feedback_count >= 8 AND status != 'resolved' ${deptClause}
  `, deptParams);

  for (const issue of recurringIssues) {
    const exists = await alertExists('recurring_issue', issue.id);
    if (!exists) {
      const [result] = await pool.query(`
        INSERT INTO alerts (type, severity, department, issue_id, title, message, status)
        VALUES (?, 'warning', ?, ?, ?, ?, 'new')
      `, [
        'recurring_issue',
        issue.department,
        issue.id,
        `Recurring Complaint: ${issue.title}`,
        `Issue "${issue.title}" has accumulated ${issue.feedback_count} recurring complaints across multiple cohorts.`
      ]);
      createdAlerts.push(result.insertId);
    }
  }

  return createdAlerts;
}

/**
 * Get alerts matching department and filters
 */
async function getAlerts(department = null, filters = {}) {
  // Automatically check alert conditions first
  await checkAndGenerateAlerts(department);

  const normDept = normalizeDepartment(department);
  let where = 'WHERE 1=1';
  const params = [];

  if (normDept) {
    where += ' AND a.department = ?';
    params.push(normDept);
  }

  if (filters.severity) {
    where += ' AND a.severity = ?';
    params.push(filters.severity);
  }

  if (filters.status) {
    where += ' AND a.status = ?';
    params.push(filters.status);
  }

  if (filters.type) {
    where += ' AND a.type = ?';
    params.push(filters.type);
  }

  if (filters.unreadOnly === 'true' || filters.unreadOnly === true) {
    where += " AND (a.is_read = 0 OR a.status = 'new')";
  }

  const [rows] = await pool.query(`
    SELECT 
      a.*,
      i.title AS issue_title
    FROM alerts a
    LEFT JOIN issues i ON a.issue_id = i.id
    ${where}
    ORDER BY 
      CASE a.severity WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 WHEN 'info' THEN 3 ELSE 4 END,
      a.created_at DESC
  `, params);

  const alerts = rows.map(formatAlert);

  // Compute alert statistics within authorized scope
  let statWhere = 'WHERE 1=1';
  const statParams = [];
  if (normDept) {
    statWhere += ' AND department = ?';
    statParams.push(normDept);
  }

  const [statRows] = await pool.query(`
    SELECT 
      COUNT(*) AS total,
      SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) AS critical,
      SUM(CASE WHEN severity = 'warning' THEN 1 ELSE 0 END) AS warning,
      SUM(CASE WHEN severity = 'info' THEN 1 ELSE 0 END) AS info,
      SUM(CASE WHEN is_read = 0 OR status = 'new' THEN 1 ELSE 0 END) AS unread,
      SUM(CASE WHEN status = 'acknowledged' THEN 1 ELSE 0 END) AS acknowledged,
      SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) AS resolved
    FROM alerts
    ${statWhere}
  `, statParams);

  const statsRaw = statRows[0] || {};
  const stats = {
    total: Number(statsRaw.total) || 0,
    critical: Number(statsRaw.critical) || 0,
    warning: Number(statsRaw.warning) || 0,
    success: 0,
    info: Number(statsRaw.info) || 0,
    unread: Number(statsRaw.unread) || 0,
    acknowledged: Number(statsRaw.acknowledged) || 0,
    resolved: Number(statsRaw.resolved) || 0
  };

  return {
    department: normDept || 'All Departments',
    stats,
    alerts
  };
}

/**
 * Get single alert by ID
 */
async function getAlertById(id, department = null) {
  const normDept = normalizeDepartment(department);
  let sql = `
    SELECT a.*, i.title AS issue_title
    FROM alerts a
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
  return formatAlert(rows[0]);
}

/**
 * Update alert status
 */
async function updateAlertStatus(id, newStatus, department = null) {
  const normDept = normalizeDepartment(department);
  const validStatuses = ['new', 'read', 'acknowledged', 'resolved', 'dismissed'];
  if (!validStatuses.includes(newStatus)) {
    throw new Error(`Invalid status "${newStatus}". Must be one of: ${validStatuses.join(', ')}`);
  }

  const existing = await getAlertById(id, normDept);
  if (!existing) return null;

  const isRead = newStatus === 'read' || newStatus === 'acknowledged' || newStatus === 'resolved';

  let timestampClause = '';
  if (newStatus === 'read') {
    timestampClause = ', read_at = COALESCE(read_at, NOW())';
  } else if (newStatus === 'acknowledged') {
    timestampClause = ', acknowledged_at = COALESCE(acknowledged_at, NOW()), read_at = COALESCE(read_at, NOW())';
  } else if (newStatus === 'resolved') {
    timestampClause = ', resolved_at = COALESCE(resolved_at, NOW()), read_at = COALESCE(read_at, NOW())';
  }

  await pool.query(`
    UPDATE alerts 
    SET status = ?, is_read = ? ${timestampClause}
    WHERE id = ?
  `, [newStatus, isRead ? 1 : 0, id]);

  return getAlertById(id, normDept);
}

/**
 * Mark single alert read
 */
async function markAlertRead(id, department = null) {
  return updateAlertStatus(id, 'read', department);
}

/**
 * Mark all alerts read within scope
 */
async function markAllAlertsRead(department = null) {
  const normDept = normalizeDepartment(department);
  let sql = 'UPDATE alerts SET is_read = 1, status = CASE WHEN status = "new" THEN "read" ELSE status END, read_at = COALESCE(read_at, NOW()) WHERE 1=1';
  const params = [];

  if (normDept) {
    sql += ' AND department = ?';
    params.push(normDept);
  }

  const [result] = await pool.query(sql, params);
  return { affectedRows: result.affectedRows };
}

/**
 * Acknowledge alert
 */
async function acknowledgeAlert(id, department = null) {
  return updateAlertStatus(id, 'acknowledged', department);
}

module.exports = {
  formatAlert,
  checkAndGenerateAlerts,
  getAlerts,
  getAlertById,
  updateAlertStatus,
  markAlertRead,
  markAllAlertsRead,
  acknowledgeAlert
};
