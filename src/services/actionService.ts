import type { Action, ActionUpdate, Department } from '@/types';
import { updateIssueStatus } from './issueService';
import { updateFeedbackStatusByIssue } from './feedbackService';
import { apiClient } from './apiClient';

type ActionListener = (actions: Action[]) => void;
const listeners: Set<ActionListener> = new Set();

export function subscribeActionChange(listener: ActionListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners() {
  listeners.forEach(l => l([...actions]));
}

let actions: Action[] = [];

function isAllDept(dept?: string | null): boolean {
  return !dept || dept === 'ALL' || dept === 'all' || dept === 'All Departments';
}

function mapBackendAction(item: any): Action {
  let mappedUpdates: ActionUpdate[] | undefined = undefined;
  if (Array.isArray(item.updates)) {
    mappedUpdates = item.updates.map((u: any) => ({
      id: String(u.id),
      actionId: String(u.actionId || u.action_id),
      updateText: u.updateText || u.update_text || '',
      previousStatus: u.previousStatus !== undefined ? u.previousStatus : (u.previous_status !== undefined ? u.previous_status : null),
      newStatus: u.newStatus || u.new_status || undefined,
      createdBy: u.createdBy || u.created_by || 'System',
      userId: u.userId !== undefined ? u.userId : (u.user_id !== undefined ? u.user_id : null),
      createdAt: u.createdAt || u.created_at ? String(u.createdAt || u.created_at) : new Date().toISOString(),
    }));
  }

  const rawCompletedAt = item.completedAt || item.completed_at;
  const completedAt = rawCompletedAt ? (typeof rawCompletedAt === 'string' ? rawCompletedAt : new Date(rawCompletedAt).toISOString()) : undefined;

  return {
    id: String(item.id),
    issueId: item.issueId ? String(item.issueId) : undefined,
    issueTitle: item.issueTitle || item.title || 'Department Action',
    possibleCause: item.possibleCause || 'Investigation required',
    action: item.action || item.title || 'Corrective Action',
    assignedTo: item.assignedTo || 'Unassigned',
    deadline: item.deadline || item.dueDate || new Date().toISOString().split('T')[0],
    status: (item.status?.toLowerCase() || 'planned') as any,
    priority: (item.priority?.toLowerCase() || 'medium') as any,
    description: item.description || '',
    notes: item.notes || undefined,
    portal: item.portal || 'education',
    bus_number: item.bus_number || item.busNumber || undefined,
    floor: item.floor || undefined,
    createdAt: item.createdAt ? String(item.createdAt).split('T')[0] : new Date().toISOString().split('T')[0],
    completedAt,
    department: (item.department || 'ALL') as Department | 'ALL',
    updates: mappedUpdates,
    impact: item.impact || undefined,
  };
}

/**
 * Fetch actions from backend /api/actions
 */
export async function fetchActions(dept?: string | null, filters: Record<string, any> = {}): Promise<Action[]> {
  try {
    const params: Record<string, any> = { ...filters };
    if (dept && !isAllDept(dept)) {
      params.department = dept;
    }
    const res = await apiClient.get('/actions', { params });
    if (res.success && Array.isArray(res.data?.actions)) {
      const mapped = res.data.actions.map(mapBackendAction);
      actions = mapped;
      notifyListeners();
      return mapped;
    }
    return [];
  } catch (err) {
    console.error('[actionService.fetchActions failed]:', err);
    throw err;
  }
}

/**
 * Resolve Bus Incharge name dynamically for a specific bus number
 */
export async function fetchBusIncharge(busNumber: string): Promise<{ name: string; email?: string; bus_number?: string; found: boolean }> {
  try {
    const res = await apiClient.get(`/bus/incharge/${encodeURIComponent(busNumber)}`);
    if (res.success && res.data) {
      return res.data;
    }
    return { name: `Bus ${busNumber} Incharge`, found: false };
  } catch (err) {
    console.warn('[actionService.fetchBusIncharge failed]:', err);
    return { name: `Bus ${busNumber} Incharge`, found: false };
  }
}

/**
 * Fetch single action by ID from backend /api/actions/:id
 */
export async function fetchActionById(id: string): Promise<Action | null> {
  try {
    const res = await apiClient.get(`/actions/${id}`);
    if (res.success && res.data) {
      return mapBackendAction(res.data);
    }
    return null;
  } catch (err) {
    console.error(`[actionService.fetchActionById ${id} failed]:`, err);
    throw err;
  }
}

/**
 * Create corrective action in backend /api/actions
 */
export async function createAction(action: Omit<Action, 'id' | 'createdAt'> & { feedbackId?: number }): Promise<Action> {
  const payload: Record<string, any> = {
    title: action.action,
    action: action.action,
    description: action.description || '',
    issueId: action.issueId ? parseInt(action.issueId, 10) || null : null,
    issueTitle: action.issueTitle || null,
    department: action.department,
    assignedTo: action.assignedTo,
    deadline: action.deadline,
    dueDate: action.deadline,
    status: action.status || 'planned',
    priority: action.priority || 'medium',
    notes: action.notes || null,
  };
  if (action.portal) payload.portal = action.portal;
  if (action.bus_number) payload.bus_number = action.bus_number;
  if (action.floor) payload.floor = action.floor;
  if ((action as any).feedbackId) payload.feedbackId = (action as any).feedbackId;

  try {
    const res = await apiClient.post('/actions', payload);
    if (res.success && res.data) {
      const created = mapBackendAction(res.data);
      actions = [created, ...actions];
      if (action.issueId) {
        updateIssueStatus(action.issueId, 'action_planned');
      }
      notifyListeners();
      return created;
    }
  } catch (err) {
    console.error('[actionService.createAction API error]:', err);
    throw err;
  }

  // Fallback memory creation
  const newAction: Action = {
    ...action,
    id: `action-${actions.length + 1}-${Date.now()}`,
    createdAt: new Date().toISOString().split('T')[0],
  };
  actions = [newAction, ...actions];
  if (action.issueId) {
    updateIssueStatus(action.issueId, 'action_planned');
  }
  notifyListeners();
  return newAction;
}

/**
 * Update action in backend /api/actions/:id
 */
export async function updateAction(id: string, updates: Partial<Action>): Promise<void> {
  const action = actions.find(a => a.id === id);
  if (action) {
    Object.assign(action, updates);
    notifyListeners();
  }

  try {
    await apiClient.put(`/actions/${id}`, updates);
  } catch (err) {
    console.error(`[actionService.updateAction ${id} API error]:`, err);
    throw err;
  }
}

/**
 * Delete action in backend /api/actions/:id
 */
export async function deleteAction(id: string): Promise<void> {
  actions = actions.filter(a => a.id !== id);
  notifyListeners();

  try {
    await apiClient.delete(`/actions/${id}`);
  } catch (err) {
    console.warn(`[actionService.deleteAction ${id} API error]:`, err);
  }
}

/**
 * Add progress update audit entry via backend /api/actions/:id/updates
 */
export async function addActionUpdate(id: string, updateText: string, newStatus?: string): Promise<void> {
  try {
    await apiClient.post(`/actions/${id}/updates`, { updateText, newStatus });
  } catch (err) {
    console.error(`[actionService.addActionUpdate ${id} failed]:`, err);
    throw err;
  }
}

export function getAllActions(dept?: string | null): Action[] {
  if (isAllDept(dept)) return [...actions];
  return actions.filter(a => a.department === dept);
}

export function getActionById(id: string): Action | undefined {
  return actions.find(a => a.id === id);
}

export function getActionsByStatus(status: Action['status'], dept?: string | null): Action[] {
  return getAllActions(dept).filter(a => a.status === status);
}

export function getActionsByIssue(issueId: string): Action[] {
  return actions.filter(a => a.issueId === issueId);
}

export function getActionStats(dept?: string | null) {
  const data = getAllActions(dept);
  return {
    total: data.length,
    planned: data.filter(a => a.status === 'planned').length,
    inProgress: data.filter(a => a.status === 'in_progress').length,
    completed: data.filter(a => a.status === 'completed').length,
    overdue: data.filter(a => a.status === 'overdue').length,
    withImpact: data.filter(a => a.impact).length,
    avgImprovement: Math.round(data.filter(a => a.impact).reduce((sum, a) => sum + (a.impact?.improvement || 0), 0) / (data.filter(a => a.impact).length || 1)),
  };
}
