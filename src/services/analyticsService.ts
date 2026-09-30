import type { Theme, DepartmentMetric, CampusArea, Severity, Category } from '@/types';
import { getCategoryBreakdown, getFeedbackStats, getTodaysFeedback } from './feedbackService';
import { getAllIssues, getCriticalIssues } from './issueService';
import { getAllActions } from './actionService';
import { apiClient } from './apiClient';

let themes: Theme[] = [];
let departmentMetrics: DepartmentMetric[] = [];
let campusAreas: CampusArea[] = [];

function isAllDept(dept?: string | null): boolean {
  return !dept || dept === 'ALL' || dept === 'all' || dept === 'All Departments';
}

/**
 * Fetch live dashboard metrics from backend /api/analytics/dashboard
 */
export async function fetchInstitutionStats(dept?: string | null) {
  const params: Record<string, any> = {};
  if (dept && !isAllDept(dept)) {
    params.department = dept;
  }
  const res = await apiClient.get('/analytics/dashboard', { params });
  return res.data;
}

/**
 * Fetch live Pulse score from backend /api/analytics/pulse
 */
export async function fetchPulse(dept?: string | null) {
  const params: Record<string, any> = {};
  if (dept && !isAllDept(dept)) {
    params.department = dept;
  }
  const res = await apiClient.get('/analytics/pulse', { params });
  return res.data;
}

/**
 * Fetch live "What Changed Today" summary from backend /api/analytics/summary
 */
export async function fetchSummary(dept?: string | null) {
  const params: Record<string, any> = {};
  if (dept && !isAllDept(dept)) {
    params.department = dept;
  }
  const res = await apiClient.get('/analytics/summary', { params });
  return res.data;
}

/**
 * Fetch live theme analytics from backend /api/analytics/themes
 */
export async function fetchThemes(dept?: string | null): Promise<Theme[]> {
  const params: Record<string, any> = {};
  if (dept && !isAllDept(dept)) {
    params.department = dept;
  }
  const res = await apiClient.get('/analytics/themes', { params });
  if (res.success && Array.isArray(res.data?.themes)) {
    return res.data.themes.map((t: any) => ({
      name: t.theme || t.name,
      category: (t.category || t.theme) as Category,
      responses: t.feedbackCount || t.responses || 0,
      positivePercent: t.positivePercent || 0,
      negativePercent: t.negativePercent || 0,
      trend: Array.isArray(t.trend) ? t.trend : [1, 2, 3, 2, 4, 3, 2],
      priority: (t.priority || 'medium').toLowerCase() as Severity,
    }));
  }
  return [];
}

/**
 * Fetch live time-series trends from backend /api/analytics/trends
 */
export async function fetchTrends(days: number = 7, dept?: string | null) {
  const params: Record<string, any> = { days };
  if (dept && !isAllDept(dept)) {
    params.department = dept;
  }
  const res = await apiClient.get('/analytics/trends', { params });
  return res.data;
}

/**
 * Fetch live 9-department comparison matrix from backend /api/analytics/department-comparison
 */
export async function fetchDepartmentComparison() {
  const res = await apiClient.get('/analytics/department-comparison');
  return res.data;
}

export function getAllThemes(dept?: string | null): Theme[] {
  if (isAllDept(dept)) {
    return [...themes];
  }
  const breakdown = getCategoryBreakdown(dept);
  return breakdown.map(b => {
    const cat = b.category;
    const total = b.count || 1;
    const posPct = Math.round((b.positive / total) * 100);
    const negPct = Math.round((b.negative / total) * 100);
    let priority: Severity = 'low';
    if (negPct > 35) priority = 'critical';
    else if (negPct > 20) priority = 'high';
    else if (negPct > 10) priority = 'medium';

    return {
      name: cat,
      category: cat,
      responses: b.count,
      positivePercent: posPct,
      negativePercent: negPct,
      trend: [
        Math.max(1, Math.floor(b.count / 7)),
        Math.max(1, Math.floor(b.count / 6)),
        Math.max(1, Math.floor(b.count / 5)),
        Math.max(1, Math.floor(b.count / 6)),
        Math.max(1, Math.floor(b.count / 5)),
        Math.max(1, Math.floor(b.count / 4)),
        Math.max(1, Math.floor(b.count / 4)),
      ],
      priority,
    };
  });
}

export function getThemeByName(name: string, dept?: string | null): Theme | undefined {
  const allThemes = getAllThemes(dept);
  return allThemes.find(t => t.name === name || t.category === name);
}

export function getDepartmentMetrics(): DepartmentMetric[] {
  return [...departmentMetrics];
}

export function getDepartmentMetric(dept: string): DepartmentMetric | undefined {
  return departmentMetrics.find(d => d.department === dept);
}

export function getCampusAreas(): CampusArea[] {
  return [...campusAreas];
}

export function getCampusAreaById(id: string): CampusArea | undefined {
  return campusAreas.find(a => a.id === id);
}

export function getInstitutionStats(dept?: string | null) {
  if (!isAllDept(dept)) {
    const fbStats = getFeedbackStats(dept);
    const deptIssues = getAllIssues(dept);
    const critIssues = getCriticalIssues(dept);
    const deptActions = getAllActions(dept);
    const todays = getTodaysFeedback(dept);

    return {
      totalFeedbackToday: todays.length,
      institutionSatisfaction: fbStats.positivePercent || 0,
      activeIssues: deptIssues.filter(i => i.status !== 'resolved').length,
      criticalIssues: critIssues.length,
      actionsInProgress: deptActions.filter(a => a.status === 'in_progress').length,
      totalDepartments: 1,
      totalStudents: 0,
      avgResolutionTime: 0,
      improvementRate: 0,
      responseRate: 0,
      campusAreas: campusAreas.length,
      themes: themes.length,
      topIssues: critIssues.slice(0, 3).map(i => ({
        name: i.title,
        department: dept!,
        severity: i.severity,
      })),
    };
  }

  const allActiveIssues = getAllIssues().filter(i => i.status !== 'resolved').length;
  const allCritIssues = getCriticalIssues().length;
  const allActionsProg = getAllActions().filter(a => a.status === 'in_progress').length;
  const allTodays = getTodaysFeedback().length;
  const allFbStats = getFeedbackStats();

  return {
    totalFeedbackToday: allTodays,
    institutionSatisfaction: allFbStats.positivePercent || 0,
    activeIssues: allActiveIssues,
    criticalIssues: allCritIssues,
    actionsInProgress: allActionsProg,
    totalDepartments: 9,
    totalStudents: 0,
    avgResolutionTime: 0,
    improvementRate: 0,
    responseRate: 0,
    campusAreas: campusAreas.length,
    themes: themes.length,
    topIssues: getCriticalIssues().slice(0, 3).map(i => ({
      name: i.title,
      department: i.department,
      severity: i.severity,
    })),
  };
}
