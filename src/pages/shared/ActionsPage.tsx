import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Badge, Button, EmptyState } from '@/components/common/UI';
import { Modal } from '@/components/common/Modal';
import { getAllActions, createAction, updateAction, getActionStats, deleteAction } from '@/services/actionService';
import { getAllIssues } from '@/services/issueService';
import { CheckSquare, Plus, Clock, CheckCircle, AlertCircle, Calendar, User, Edit, X, TrendingUp, ArrowRight } from 'lucide-react';
import type { Role, Action } from '@/types';

const statusConfig: Record<Action['status'], { label: string; color: string; bg: string; icon: typeof Clock }> = {
  planned: { label: 'Planned', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', icon: Clock },
  in_progress: { label: 'In Progress', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', icon: AlertCircle },
  completed: { label: 'Completed', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: CheckCircle },
  overdue: { label: 'Overdue', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20', icon: AlertCircle },
};

import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';

export function ActionsPage({ role }: { role: Role }) {
  const { user } = useAuth();
  const effectiveDept = role === 'hod' ? user?.department : (user?.department || undefined);
  const [actions, setActions] = useState(() => getAllActions(effectiveDept));
  const [filter, setFilter] = useState<string>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [editingAction, setEditingAction] = useState<Action | null>(null);
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const navigate = useNavigate();
  const stats = getActionStats(effectiveDept);
  const issues = getAllIssues(effectiveDept);

  useEffect(() => {
    setActions(getAllActions(effectiveDept));
  }, [effectiveDept]);

  const filtered = filter === 'all' ? actions : actions.filter(a => a.status === filter);

  const refresh = () => setActions(getAllActions(effectiveDept));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Action Center</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage corrective actions from planning to impact measurement {effectiveDept ? `· ${effectiveDept}` : '· Institution-wide'}
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={16} />
          Create Action
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {(Object.keys(statusConfig) as Action['status'][]).map(status => {
          const cfg = statusConfig[status];
          const Icon = cfg.icon;
          const count = (actions.filter(a => a.status === status)).length;
          return (
            <Card key={status} className="p-4 cursor-pointer" hover onClick={() => setFilter(filter === status ? 'all' : status)}>
              <div className="flex items-center gap-2 mb-1">
                <Icon size={16} className={cfg.color} />
                <span className="text-xs text-slate-400">{cfg.label}</span>
              </div>
              <p className={`text-2xl font-bold ${cfg.color}`}>{count}</p>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${filter === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}>All Actions</button>
        {(Object.keys(statusConfig) as Action['status'][]).map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${filter === s ? 'bg-blue-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}>{statusConfig[s].label}</button>
        ))}
      </div>

      {/* Actions list */}
      {filtered.length === 0 ? (
        <EmptyState icon={<CheckSquare size={48} />} title="No actions in this category" message="Create a new action or change the filter." actionLabel="Create Action" onAction={() => setShowCreate(true)} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(action => {
            const cfg = statusConfig[action.status];
            const Icon = cfg.icon;
            return (
              <Card key={action.id} className="p-5" hover onClick={() => setSelectedAction(action)}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${cfg.bg}`}>
                      <Icon size={16} className={cfg.color} />
                    </div>
                    <Badge variant={action.status === 'completed' ? 'success' : action.status === 'overdue' ? 'critical' : action.status === 'in_progress' ? 'warning' : 'info'}>{cfg.label}</Badge>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setEditingAction(action); }} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors">
                    <Edit size={14} />
                  </button>
                </div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">{action.action}</h3>
                <p className="text-xs text-slate-400 mb-3">For: {action.issueTitle}</p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <User size={12} /> {action.assignedTo}
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <Calendar size={12} /> Due: {new Date(action.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
                {action.impact && (
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50 flex items-center gap-2">
                    <TrendingUp size={14} className="text-emerald-500" />
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Improvement: +{action.impact.improvement} pts</span>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Action Modal */}
      <CreateActionModal open={showCreate} onClose={() => setShowCreate(false)} issues={issues} onCreated={() => { refresh(); setShowCreate(false); }} />

      {/* Edit Action Modal */}
      <EditActionModal action={editingAction} onClose={() => setEditingAction(null)} onSaved={() => { refresh(); setEditingAction(null); }} />

      {/* Action Detail Modal with Impact */}
      <Modal open={!!selectedAction} onClose={() => setSelectedAction(null)} title="Action Details" size="lg">
        {selectedAction && <ActionDetail action={selectedAction} role={role} onViewImpact={() => navigate(`/${role}/actions/${selectedAction.id}`)} />}
      </Modal>
    </div>
  );
}

function CreateActionModal({ open, onClose, issues, onCreated }: { open: boolean; onClose: () => void; issues: ReturnType<typeof getAllIssues>; onCreated: () => void }) {
  const { user } = useAuth();
  const [issueId, setIssueId] = useState('');
  const [action, setAction] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [deadline, setDeadline] = useState('');
  const [possibleCause, setPossibleCause] = useState('');

  const handleSubmit = () => {
    const issue = issues.find(i => i.id === issueId);
    if (!issue || !action || !assignedTo || !deadline) return;
    createAction({
      issueId,
      issueTitle: issue.title,
      possibleCause: possibleCause || 'To be determined',
      action,
      assignedTo,
      deadline,
      status: 'planned',
      department: user?.department || 'ALL',
    });
    onCreated();
    setIssueId(''); setAction(''); setAssignedTo(''); setDeadline(''); setPossibleCause('');
  };

  return (
    <Modal open={open} onClose={onClose} title="Create Corrective Action" size="md">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Related Issue</label>
          <select value={issueId} onChange={e => setIssueId(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
            <option value="">Select an issue...</option>
            {issues.map(i => <option key={i.id} value={i.id}>{i.title}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Possible Cause</label>
          <input type="text" value={possibleCause} onChange={e => setPossibleCause(e.target.value)} placeholder="e.g., Outdated hardware" className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Action Description</label>
          <textarea value={action} onChange={e => setAction(e.target.value)} placeholder="e.g., Upgrade lab systems with new hardware" rows={3} className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Assigned To</label>
            <input type="text" value={assignedTo} onChange={e => setAssignedTo(e.target.value)} placeholder="e.g., IT Department" className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Deadline</label>
            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
          </div>
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!issueId || !action || !assignedTo || !deadline}>Create Action</Button>
        </div>
      </div>
    </Modal>
  );
}

function EditActionModal({ action, onClose, onSaved }: { action: Action | null; onClose: () => void; onSaved: () => void }) {
  const [status, setStatus] = useState<Action['status']>('planned');
  const [assignedTo, setAssignedTo] = useState('');
  const [deadline, setDeadline] = useState('');

  useState(() => {
    if (action) { setStatus(action.status); setAssignedTo(action.assignedTo); setDeadline(action.deadline); }
  });

  // Sync when action changes
  if (action && status === 'planned' && assignedTo === '' && action.status !== 'planned') {
    setStatus(action.status);
    setAssignedTo(action.assignedTo);
    setDeadline(action.deadline);
  }

  const handleSave = () => {
    if (!action) return;
    updateAction(action.id, { status, assignedTo, deadline });
    onSaved();
  };

  return (
    <Modal open={!!action} onClose={onClose} title="Edit Action" size="md">
      {action && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value as Action['status'])} className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
              <option value="planned">Planned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Assigned To</label>
            <input type="text" value={assignedTo} onChange={e => setAssignedTo(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Deadline</label>
            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function ActionDetail({ action, role, onViewImpact }: { action: Action; role: Role; onViewImpact: () => void }) {
  const cfg = statusConfig[action.status];
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant={action.status === 'completed' ? 'success' : action.status === 'overdue' ? 'critical' : action.status === 'in_progress' ? 'warning' : 'info'}>{cfg.label}</Badge>
        {action.department !== 'ALL' && <Badge variant="default">{action.department}</Badge>}
      </div>
      <div>
        <p className="text-xs text-slate-400 mb-1">Action</p>
        <p className="text-base font-semibold text-slate-800 dark:text-slate-100">{action.action}</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><p className="text-xs text-slate-400 mb-1">Issue</p><p className="text-sm font-medium text-slate-700 dark:text-slate-200">{action.issueTitle}</p></div>
        <div><p className="text-xs text-slate-400 mb-1">Possible Cause</p><p className="text-sm font-medium text-slate-700 dark:text-slate-200">{action.possibleCause}</p></div>
        <div><p className="text-xs text-slate-400 mb-1">Assigned To</p><p className="text-sm font-medium text-slate-700 dark:text-slate-200">{action.assignedTo}</p></div>
        <div><p className="text-xs text-slate-400 mb-1">Deadline</p><p className="text-sm font-medium text-slate-700 dark:text-slate-200">{new Date(action.deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p></div>
      </div>
      {action.impact ? (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={18} className="text-emerald-500" />
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Improvement Detected</p>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">Negative feedback reduced from {action.impact.beforeNegative}% to {action.impact.afterNegative}% (+{action.impact.improvement} percentage points)</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={onViewImpact}>View Impact Tracking <ArrowRight size={14} /></Button>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30">
          <p className="text-sm text-slate-500 dark:text-slate-400">No impact data yet. Impact will be measured once the action is completed.</p>
        </div>
      )}
    </div>
  );
}
