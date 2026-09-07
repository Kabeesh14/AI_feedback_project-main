import type { Action } from '@/types';
import { generateActions } from './mockData';
import { updateIssueStatus } from './issueService';
import { updateFeedbackStatusByIssue } from './feedbackService';

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

let actions: Action[] = generateActions();

function isAllDept(dept?: string | null): boolean {
  return !dept || dept === 'ALL' || dept === 'all' || dept === 'All Departments';
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

export function createAction(action: Omit<Action, 'id' | 'createdAt'>): Action {
  const newAction: Action = {
    ...action,
    id: `action-${actions.length + 1}-${Date.now()}`,
    createdAt: new Date().toISOString().split('T')[0],
  };
  actions = [newAction, ...actions];
  updateIssueStatus(action.issueId, 'action_planned');
  updateIssueStatus(action.issueTitle, 'action_planned');
  notifyListeners();
  return newAction;
}

export function updateAction(id: string, updates: Partial<Action>): void {
  const action = actions.find(a => a.id === id);
  if (action) {
    Object.assign(action, updates);
    if (updates.status === 'completed') {
      if (!action.impact) {
        action.impact = {
          beforeNegative: 82,
          afterNegative: 31,
          improvement: 51,
        };
      }
      updateIssueStatus(action.issueId, 'resolved');
      updateIssueStatus(action.issueTitle, 'resolved');
      updateFeedbackStatusByIssue(action.issueTitle, 'resolved');
    } else if (updates.status === 'in_progress') {
      updateIssueStatus(action.issueId, 'in_progress');
      updateIssueStatus(action.issueTitle, 'in_progress');
    }
    notifyListeners();
  }
}

export function deleteAction(id: string): void {
  actions = actions.filter(a => a.id !== id);
  notifyListeners();
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

