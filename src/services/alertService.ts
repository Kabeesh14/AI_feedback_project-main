import type { Alert } from '@/types';
import { generateAlerts } from './mockData';

let alerts: Alert[] = generateAlerts();

function isAllDept(dept?: string | null): boolean {
  return !dept || dept === 'ALL' || dept === 'all' || dept === 'All Departments';
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

export function markAlertRead(id: string): void {
  const alert = alerts.find(a => a.id === id);
  if (alert) alert.read = true;
}

export function markAllRead(): void {
  alerts.forEach(a => { a.read = true; });
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
