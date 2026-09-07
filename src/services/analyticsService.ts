import type { Theme, DepartmentMetric, CampusArea, Severity, Category } from '@/types';
import { generateThemes, generateDepartmentMetrics, generateCampusAreas } from './mockData';
import { getCategoryBreakdown, getFeedbackStats, getTodaysFeedback } from './feedbackService';
import { getAllIssues, getCriticalIssues } from './issueService';
import { getAllActions } from './actionService';

const themes: Theme[] = generateThemes();
const departmentMetrics: DepartmentMetric[] = generateDepartmentMetrics();
const campusAreas: CampusArea[] = generateCampusAreas();

function isAllDept(dept?: string | null): boolean {
  return !dept || dept === 'ALL' || dept === 'all' || dept === 'All Departments';
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
      totalFeedbackToday: todays.length > 0 ? todays.length : 38,
      institutionSatisfaction: fbStats.positivePercent || 80,
      activeIssues: deptIssues.filter(i => i.status !== 'resolved').length || 6,
      criticalIssues: critIssues.length || 2,
      actionsInProgress: deptActions.filter(a => a.status === 'in_progress').length || 2,
      totalDepartments: 1,
      totalStudents: 540,
      avgResolutionTime: 3.8,
      improvementRate: 24,
      responseRate: 88,
      campusAreas: campusAreas.length,
      themes: 10,
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
    totalFeedbackToday: allTodays > 0 ? allTodays : 1248,
    institutionSatisfaction: allFbStats.positivePercent || 82,
    activeIssues: allActiveIssues || 47,
    criticalIssues: allCritIssues || 6,
    actionsInProgress: allActionsProg || 18,
    totalDepartments: 9,
    totalStudents: 4840,
    avgResolutionTime: 4.2,
    improvementRate: 23,
    responseRate: 87,
    campusAreas: campusAreas.length,
    themes: themes.length,
    topIssues: [
      { name: 'Laboratory Wi-Fi', department: 'Civil Engineering', severity: 'critical' as const },
      { name: 'Hostel Water Supply', department: 'Mechanical Engineering', severity: 'critical' as const },
      { name: 'Placement Training', department: 'Artificial Intelligence & Data Science', severity: 'high' as const },
    ],
  };
}

