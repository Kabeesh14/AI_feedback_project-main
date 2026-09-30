import type { Issue, PossibleCause, FeedbackStatus, Category, Severity, Department } from '@/types';
import { apiClient } from './apiClient';

type IssueListener = (issues: Issue[]) => void;
const listeners: Set<IssueListener> = new Set();

export function subscribeIssueChange(listener: IssueListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners() {
  listeners.forEach(l => l([...issues]));
}

let issues: Issue[] = [];
let rootCauses: (PossibleCause & { issueId?: string; issueTitle?: string; department?: string })[] = [];

function isAllDept(dept?: string | null): boolean {
  return !dept || dept === 'ALL' || dept === 'all' || dept === 'All Departments';
}

function mapBackendIssue(item: any): Issue {
  const statusMap: Record<string, FeedbackStatus> = {
    identified: 'received',
    analyzing: 'under_review',
    action_planned: 'action_planned',
    in_progress: 'in_progress',
    resolved: 'resolved',
  };

  const complaintCount = item.complaintCount != null ? Number(item.complaintCount) : (item.feedbackCount != null ? Number(item.feedbackCount) : 0);
  const negativePercent = typeof item.negativePercent === 'number' ? item.negativePercent : 0;
  const trend = Array.isArray(item.trend) ? item.trend : [];

  return {
    id: String(item.id),
    title: item.title || 'Institutional Issue',
    category: (item.category || 'Other') as Category,
    portal: item.portal || 'education',
    bus_number: item.bus_number || item.busNumber || undefined,
    floor: item.floor || undefined,
    severity: (item.severity || item.priority || 'medium').toLowerCase() as Severity,
    complaintCount,
    negativePercent,
    trend,
    affectedYears: Array.isArray(item.affectedYears) ? item.affectedYears : [],
    affectedLocations: Array.isArray(item.affectedLocations) ? item.affectedLocations : [],
    department: (item.department || 'ALL') as Department | 'ALL',
    keywords: Array.isArray(item.keywords) ? item.keywords : [],
    cluster: Array.isArray(item.cluster) ? item.cluster : [],
    status: (statusMap[item.status] || item.status || 'received') as FeedbackStatus,
    priorityScore: item.impactScore != null ? Number(item.impactScore) : (item.priorityScore != null ? Number(item.priorityScore) : null),
  };
}

function mapBackendCause(r: any): PossibleCause & { issueId?: string; issueTitle?: string; department?: string } {
  let confidence: 'low' | 'moderate' | 'high' = 'moderate';
  if (r.confidence === 'high' || r.confidence === 'moderate' || r.confidence === 'low') {
    confidence = r.confidence;
  } else if (typeof r.confidence === 'number') {
    confidence = r.confidence >= 80 ? 'high' : r.confidence >= 50 ? 'moderate' : 'low';
  }

  const evidence = Array.isArray(r.evidence)
    ? r.evidence.filter(Boolean)
    : r.evidence
    ? [r.evidence]
    : [];

  return {
    id: String(r.id),
    factor: r.factor || r.cause_text || 'Contributing Factor',
    relatedFeedbackCount: Number(r.supportingCount ?? r.supporting_count ?? r.relatedFeedbackCount) || 0,
    supportingKeywords: Array.isArray(r.supportingKeywords) ? r.supportingKeywords : [],
    evidenceExamples: evidence,
    confidence,
    issueId: r.issueId ? String(r.issueId) : undefined,
    issueTitle: r.issueTitle ? String(r.issueTitle) : undefined,
    department: r.department ? String(r.department) : undefined,
  };
}

/**
 * Fetch issues from real backend /api/analytics/issues
 */
export async function fetchIssues(dept?: string | null, filters: Record<string, any> = {}): Promise<Issue[]> {
  try {
    const params: Record<string, any> = { ...filters };
    if (dept && !isAllDept(dept)) {
      params.department = dept;
    }
    const res = await apiClient.get('/analytics/issues', { params });
    if (res.success && Array.isArray(res.data?.issues)) {
      const mapped = res.data.issues.map(mapBackendIssue);
      issues = mapped;
      notifyListeners();
      return mapped;
    }
    return getAllIssues(dept);
  } catch (err) {
    console.error('[issueService.fetchIssues failed]:', err);
    throw err;
  }
}

/**
 * Fetch root causes from real backend /api/analytics/root-causes
 */
export async function fetchPossibleCauses(dept?: string | null, filters: Record<string, any> = {}): Promise<PossibleCause[]> {
  try {
    const params: Record<string, any> = { ...filters };
    if (dept && !isAllDept(dept)) {
      params.department = dept;
    }
    const res = await apiClient.get('/analytics/root-causes', { params });
    if (res.success && Array.isArray(res.data?.rootCauses)) {
      const mapped = res.data.rootCauses.map(mapBackendCause);
      rootCauses = mapped;
      return mapped;
    }
    return [];
  } catch (err) {
    console.error('[issueService.fetchPossibleCauses failed]:', err);
    throw err;
  }
}

export function getAllIssues(dept?: string | null): Issue[] {
  if (isAllDept(dept)) return [...issues];
  return issues.filter(i => i.department === dept);
}

export function updateIssueStatus(idOrTitle: string, status: FeedbackStatus): void {
  const issue = issues.find(i => i.id === idOrTitle || i.title === idOrTitle);
  if (issue) {
    issue.status = status;
    notifyListeners();
  }
}

export function getIssueById(id: string): Issue | undefined {
  return issues.find(i => String(i.id) === String(id));
}

export function getIssuesBySeverity(severity: Issue['severity'], dept?: string | null): Issue[] {
  return getAllIssues(dept).filter(i => i.severity === severity);
}

export function getCriticalIssues(dept?: string | null): Issue[] {
  return getAllIssues(dept).filter(i => i.severity === 'critical');
}

export function getHighPriorityIssues(dept?: string | null): Issue[] {
  return getAllIssues(dept).filter(i => i.severity === 'high' || i.severity === 'critical');
}

export function searchIssues(query: string, dept?: string | null): Issue[] {
  const l = query.toLowerCase();
  return getAllIssues(dept).filter(i =>
    i.title.toLowerCase().includes(l) ||
    i.category.toLowerCase().includes(l) ||
    (Array.isArray(i.keywords) && i.keywords.some(k => k.toLowerCase().includes(l)))
  );
}

export function getPossibleCauses(issueTitleOrId: string): PossibleCause[] {
  const norm = issueTitleOrId.toLowerCase().trim();
  return rootCauses.filter(
    c => (c.issueTitle && c.issueTitle.toLowerCase().trim() === norm) ||
         (c.issueId && String(c.issueId) === String(issueTitleOrId))
  );
}
