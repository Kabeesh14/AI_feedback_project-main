import type { Alert, Department } from '@/types';
import { apiClient } from './apiClient';

let alerts: Alert[] = [];

function isAllDept(dept?: string | null): boolean {
  return !dept || dept === 'ALL' || dept === 'all' || dept === 'All Departments';
}

function mapBackendAlert(row: any): Alert {
  return {
    id: String(row.id),
    timestamp: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    severity: (row.severity || 'warning').toLowerCase() as any,
    issue: row.issue_title || row.title || 'Alert Notice',
    reason: row.message || row.title || 'Attention required.',
    department: (row.department || 'ALL') as Department | 'ALL',
    read: Boolean(row.is_read || row.status === 'read' || row.status === 'resolved' || row.status === 'acknowledged'),
    issueId: row.issue_id ? String(row.issue_id) : undefined,
  };
}

/**
 * Fetch alerts from backend /api/alerts
 */
export async function fetchAlerts(dept?: string | null, filters: Record<string, any> = {}): Promise<Alert[]> {
  try {
    const params: Record<string, any> = { ...filters };
    if (dept && !isAllDept(dept)) {
      params.department = dept;
    }
    const res = await apiClient.get('/alerts', { params });
    if (res.success && res.data?.alerts) {
      const mapped = res.data.alerts.map(mapBackendAlert);
      alerts = mapped;
      return mapped;
    }
    return getAllAlerts(dept);
  } catch (err) {
    console.error('[alertService.fetchAlerts failed]:', err);
    throw err;
  }
}

/**
 * Fetch alert by ID from backend /api/alerts/:id
 */
export async function fetchAlertById(id: string): Promise<Alert | null> {
  try {
    const res = await apiClient.get(`/alerts/${id}`);
    if (res.success && res.data) {
      return mapBackendAlert(res.data);
    }
    return null;
  } catch (err) {
    console.error(`[alertService.fetchAlertById ${id} failed]:`, err);
    throw err;
  }
}

/**
 * Mark alert read via backend /api/alerts/:id/read
 */
export async function markAlertRead(id: string): Promise<void> {
  // Update local memory
  const alert = alerts.find(a => a.id === id);
  if (alert) alert.read = true;

  try {
    await apiClient.put(`/alerts/${id}/read`);
  } catch (err) {
    console.warn(`[alertService.markAlertRead ${id} API error]:`, err);
  }
}

/**
 * Mark all alerts read via backend /api/alerts/read-all
 */
export async function markAllRead(): Promise<void> {
  alerts.forEach(a => { a.read = true; });

  try {
    await apiClient.put('/alerts/read-all');
  } catch (err) {
    console.warn('[alertService.markAllRead API error]:', err);
  }
}

/**
 * Acknowledge alert via backend /api/alerts/:id/acknowledge
 */
export async function acknowledgeAlert(id: string): Promise<void> {
  const alert = alerts.find(a => a.id === id);
  if (alert) alert.read = true;

  try {
    await apiClient.post(`/alerts/${id}/acknowledge`);
  } catch (err) {
    console.warn(`[alertService.acknowledgeAlert ${id} API error]:`, err);
  }
}

export function getAllAlerts(dept?: string | null): Alert[] {
  if (isAllDept(dept)) return [...alerts];
  return alerts.filter(a => a.department === dept);
}

export function getUnreadAlerts(dept?: string | null): Alert[] {
  return getAllAlerts(dept).filter(a => !a.read);
}

export function getAlertsBySeverity(severity: Alert['severity'], dept?: string | null): Alert[] {
  return getAllAlerts(dept).filter(a => a.severity === severity);
}

export function getAlertStats(dept?: string | null) {
  const data = getAllAlerts(dept);
  return {
    total: data.length,
    critical: data.filter(a => a.severity === 'critical').length,
    warning: data.filter(a => a.severity === 'warning').length,
    success: data.filter(a => a.severity === 'success').length,
    info: data.filter(a => a.severity === 'info').length,
    unread: data.filter(a => !a.read).length,
  };
}
