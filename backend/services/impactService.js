const { pool } = require('../config/db');
const actionService = require('./actionService');
const { normalizeDepartment } = require('./analyticsService');

const DEFAULT_WINDOW_DAYS = 14;

/**
 * Evaluate action impact with before/after comparison
 */
async function evaluateActionImpact(actionId, department = null, windowDays = DEFAULT_WINDOW_DAYS) {
  const normDept = normalizeDepartment(department);
  const action = await actionService.getActionById(actionId, normDept);
  if (!action) return null;

  const days = Math.max(7, Math.min(60, parseInt(windowDays, 10) || DEFAULT_WINDOW_DAYS));

  // Determine query scope (issue-specific or category/department)
  let scopeClause = 'department = ?';
  let scopeParams = [action.department];

  if (action.issueId) {
    scopeClause += ' AND (issue_id = ? OR category = (SELECT category FROM issues WHERE id = ?))';
    scopeParams.push(action.issueId, action.issueId);
  }

  // Check if action is completed
  const isCompleted = action.status === 'completed' && action.completedAt;
  const pivotDate = isCompleted ? new Date(action.completedAt) : new Date(action.createdAt);

  // 1. Calculate BEFORE metrics (windowDays prior to pivot date)
  const [beforeRows] = await pool.query(`
    SELECT 
      COUNT(*) AS total,
      COALESCE(AVG(rating), 0) AS avgRating,
      SUM(CASE WHEN sentiment = 'positive' THEN 1 ELSE 0 END) AS posCount,
      SUM(CASE WHEN sentiment = 'neutral' THEN 1 ELSE 0 END) AS neuCount,
      SUM(CASE WHEN sentiment = 'negative' THEN 1 ELSE 0 END) AS negCount
    FROM feedback
    WHERE ${scopeClause}
      AND created_at >= DATE_SUB(?, INTERVAL ? DAY)
      AND created_at <= ?
  `, [...scopeParams, pivotDate, days, pivotDate]);

  const bRaw = beforeRows[0] || {};
  const beforeTotal = Number(bRaw.total) || 0;
  const beforePos = Number(bRaw.posCount) || 0;
  const beforeNeg = Number(bRaw.negCount) || 0;
  const beforeAvgRating = Number(Number(bRaw.avgRating).toFixed(2)) || 0;
  const beforeNegPct = beforeTotal > 0 ? Math.round((beforeNeg / beforeTotal) * 100) : 0;
  const beforePosPct = beforeTotal > 0 ? Math.round((beforePos / beforeTotal) * 100) : 0;

  const beforeMetrics = {
    window: `${days} days prior to completion`,
    startDate: new Date(pivotDate.getTime() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    endDate: pivotDate.toISOString().slice(0, 10),
    feedbackCount: beforeTotal,
    averageRating: beforeAvgRating,
    negativePercent: beforeNegPct,
    positivePercent: beforePosPct,
    complaintCount: beforeNeg
  };

  // 2. If action is not completed, return insufficient_data state
  if (!isCompleted) {
    return {
      actionId: String(action.id),
      actionTitle: action.title,
      department: action.department,
      status: action.status,
      evaluation: 'insufficient_data',
      confidence: 0,
      dataSufficient: false,
      before: beforeMetrics,
      after: {
        window: `${days} days post completion`,
        feedbackCount: 0,
        averageRating: 0,
        negativePercent: 0,
        positivePercent: 0,
        complaintCount: 0
      },
      changes: {
        ratingChange: 0,
        negativeChange: 0,
        positiveChange: 0,
        complaintReductionPct: 0,
        improvementPoints: 0
      },
      effectivenessScore: 0,
      explanation: `Action is currently in "${action.status}" status. Impact evaluation requires action completion and subsequent post-action feedback collection.`,
      evaluatedAt: new Date().toISOString()
    };
  }

  // 3. Calculate AFTER metrics (windowDays post completion up to NOW())
  const [afterRows] = await pool.query(`
    SELECT 
      COUNT(*) AS total,
      COALESCE(AVG(rating), 0) AS avgRating,
      SUM(CASE WHEN sentiment = 'positive' THEN 1 ELSE 0 END) AS posCount,
      SUM(CASE WHEN sentiment = 'neutral' THEN 1 ELSE 0 END) AS neuCount,
      SUM(CASE WHEN sentiment = 'negative' THEN 1 ELSE 0 END) AS negCount
    FROM feedback
    WHERE ${scopeClause}
      AND created_at > ?
      AND created_at <= DATE_ADD(?, INTERVAL ? DAY)
  `, [...scopeParams, pivotDate, pivotDate, days]);

  const aRaw = afterRows[0] || {};
  const afterTotal = Number(aRaw.total) || 0;
  const afterPos = Number(aRaw.posCount) || 0;
  const afterNeg = Number(aRaw.negCount) || 0;
  const afterAvgRating = Number(Number(aRaw.avgRating).toFixed(2)) || 0;
  const afterNegPct = afterTotal > 0 ? Math.round((afterNeg / afterTotal) * 100) : 0;
  const afterPosPct = afterTotal > 0 ? Math.round((afterPos / afterTotal) * 100) : 0;

  const afterMetrics = {
    window: `${days} days post completion`,
    startDate: pivotDate.toISOString().slice(0, 10),
    endDate: new Date(pivotDate.getTime() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    feedbackCount: afterTotal,
    averageRating: afterAvgRating,
    negativePercent: afterNegPct,
    positivePercent: afterPosPct,
    complaintCount: afterNeg
  };

  // 4. Check data sufficiency (minimum 2 verified feedback items collected post-completion)
  if (afterTotal < 2) {
    return {
      actionId: String(action.id),
      actionTitle: action.title,
      department: action.department,
      status: action.status,
      evaluation: 'insufficient_data',
      confidence: 0,
      dataSufficient: false,
      before: beforeMetrics,
      after: afterMetrics,
      changes: {
        ratingChange: 0,
        negativeChange: 0,
        positiveChange: 0,
        complaintReductionPct: 0,
        improvementPoints: 0
      },
      effectivenessScore: 0,
      explanation: `Insufficient post-action feedback has been collected (${afterTotal} responses found; minimum 2 required for statistical evaluation).`,
      evaluatedAt: new Date().toISOString()
    };
  }

  // 5. Calculate actual changes and effectiveness
  const ratingChange = Number((afterAvgRating - beforeAvgRating).toFixed(2));
  const negativeChange = afterNegPct - beforeNegPct; // negative is improvement
  const positiveChange = afterPosPct - beforePosPct; // positive is improvement
  const improvementPoints = beforeNegPct - afterNegPct;
  const complaintReductionPct = beforeNeg > 0 ? Math.round(((beforeNeg - afterNeg) / beforeNeg) * 100) : 0;

  let evaluation = 'not_effective';
  let confidence = 60;
  let explanation = 'No significant improvement observed in negative sentiment or rating following action completion.';

  if (negativeChange <= -15 && ratingChange >= 0.3) {
    evaluation = 'effective';
    confidence = Math.min(95, Math.max(70, Math.round(70 + Math.abs(negativeChange) / 2)));
    explanation = `Negative feedback decreased by ${Math.abs(negativeChange)} percentage points and average rating improved by ${ratingChange} stars following action completion.`;
  } else if (negativeChange < 0 || ratingChange > 0) {
    evaluation = 'partially_effective';
    confidence = 65;
    explanation = `Modest improvement observed: negative feedback changed by ${negativeChange} points with a ${ratingChange >= 0 ? '+' : ''}${ratingChange} rating shift.`;
  } else {
    evaluation = 'not_effective';
    confidence = 60;
    explanation = 'Post-action metrics indicate no noticeable reduction in negative complaints or rating improvement.';
  }

  const effectivenessScore = Math.max(0, Math.min(100, Math.round(50 + (ratingChange * 15) + (improvementPoints * 0.75))));

  return {
    actionId: String(action.id),
    actionTitle: action.title,
    department: action.department,
    status: action.status,
    evaluation,
    confidence,
    dataSufficient: true,
    before: beforeMetrics,
    after: afterMetrics,
    changes: {
      ratingChange,
      negativeChange,
      positiveChange,
      complaintReductionPct,
      improvementPoints
    },
    effectivenessScore,
    explanation,
    evaluatedAt: new Date().toISOString()
  };
}

/**
 * Get Before Metrics Breakdown
 */
async function getBeforeMetrics(actionId, department = null, windowDays = DEFAULT_WINDOW_DAYS) {
  const evalResult = await evaluateActionImpact(actionId, department, windowDays);
  if (!evalResult) return null;
  return {
    actionId: evalResult.actionId,
    actionTitle: evalResult.actionTitle,
    department: evalResult.department,
    window: evalResult.before.window,
    metrics: evalResult.before
  };
}

/**
 * Get After Metrics Breakdown
 */
async function getAfterMetrics(actionId, department = null, windowDays = DEFAULT_WINDOW_DAYS) {
  const evalResult = await evaluateActionImpact(actionId, department, windowDays);
  if (!evalResult) return null;
  return {
    actionId: evalResult.actionId,
    actionTitle: evalResult.actionTitle,
    department: evalResult.department,
    window: evalResult.after.window,
    dataSufficient: evalResult.dataSufficient,
    metrics: evalResult.after
  };
}

/**
 * Get Institution-Wide Impact Overview
 * Evaluates all completed actions across all departments (or for a specific department filter)
 * Reuses evaluateActionImpact() as the single source of truth for all impact calculations.
 */
async function getInstitutionImpactOverview({ department = null } = {}) {
  const normDept = normalizeDepartment(department);

  let query = `
    SELECT id, title, department, priority, status, completed_at, created_at, issue_id
    FROM actions
    WHERE status = 'completed'
  `;
  const params = [];

  if (normDept) {
    query += ' AND department = ?';
    params.push(normDept);
  }

  query += ' ORDER BY completed_at DESC, id DESC';

  const [completedRows] = await pool.query(query, params);

  const evaluatedActions = [];
  const deptMap = {};

  const kpis = {
    totalCompletedActions: completedRows.length,
    measurableImpactActions: 0,
    insufficientDataActions: 0,
    effectiveActions: 0,
    partiallyEffectiveActions: 0,
    notEffectiveActions: 0
  };

  for (const row of completedRows) {
    // Reuse existing evaluateActionImpact to guarantee single source of truth
    const evalResult = await evaluateActionImpact(row.id, null);
    if (!evalResult) continue;

    const dataSufficient = Boolean(evalResult.dataSufficient);
    const evaluation = evalResult.evaluation;

    // Tally institutional KPIs
    if (dataSufficient) {
      kpis.measurableImpactActions += 1;
    } else {
      kpis.insufficientDataActions += 1;
    }

    if (evaluation === 'effective') {
      kpis.effectiveActions += 1;
    } else if (evaluation === 'partially_effective') {
      kpis.partiallyEffectiveActions += 1;
    } else if (evaluation === 'not_effective') {
      kpis.notEffectiveActions += 1;
    }

    // Tally department summaries
    const deptName = row.department || 'Unknown';
    if (!deptMap[deptName]) {
      deptMap[deptName] = {
        department: deptName,
        completedActions: 0,
        measurableImpactActions: 0,
        insufficientDataActions: 0,
        effectiveActions: 0,
        partiallyEffectiveActions: 0,
        notEffectiveActions: 0
      };
    }

    deptMap[deptName].completedActions += 1;
    if (dataSufficient) {
      deptMap[deptName].measurableImpactActions += 1;
    } else {
      deptMap[deptName].insufficientDataActions += 1;
    }

    if (evaluation === 'effective') {
      deptMap[deptName].effectiveActions += 1;
    } else if (evaluation === 'partially_effective') {
      deptMap[deptName].partiallyEffectiveActions += 1;
    } else if (evaluation === 'not_effective') {
      deptMap[deptName].notEffectiveActions += 1;
    }

    // Format action item with real evaluation data
    evaluatedActions.push({
      id: String(row.id),
      title: row.title,
      department: row.department,
      priority: row.priority,
      completedAt: row.completed_at instanceof Date ? row.completed_at.toISOString() : (row.completed_at || null),
      dataSufficient,
      beforeRating: evalResult.before?.averageRating ?? 0,
      afterRating: evalResult.after?.averageRating ?? 0,
      beforeNegativePct: evalResult.before?.negativePercent ?? 0,
      afterNegativePct: evalResult.after?.negativePercent ?? 0,
      beforePositivePct: evalResult.before?.positivePercent ?? 0,
      afterPositivePct: evalResult.after?.positivePercent ?? 0,
      complaintReduction: evalResult.changes?.complaintReductionPct ?? 0,
      effectivenessScore: evalResult.effectivenessScore ?? 0,
      effectiveness: evaluation,
      evaluation: evaluation,
      explanation: evalResult.explanation
    });
  }

  // Convert department summary map to an array, sorted by department name
  const departments = Object.values(deptMap).sort((a, b) => a.department.localeCompare(b.department));

  return {
    kpis,
    departments,
    actions: evaluatedActions,
    filterDepartment: normDept || null
  };
}

module.exports = {
  evaluateActionImpact,
  getBeforeMetrics,
  getAfterMetrics,
  getInstitutionImpactOverview
};
