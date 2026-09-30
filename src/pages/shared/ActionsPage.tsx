import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Badge, Button, EmptyState } from '@/components/common/UI';
import { Modal } from '@/components/common/Modal';
import {
  getAllActions,
  fetchActions,
  fetchActionById,
  subscribeActionChange,
  createAction,
  updateAction,
  getActionStats,
  deleteAction
} from '@/services/actionService';
import { getAllIssues } from '@/services/issueService';
import {
  CheckSquare,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  User,
  Edit,
  X,
  TrendingUp,
  ArrowRight,
  Building2,
  Tag,
  History,
  Loader2
} from 'lucide-react';
import { OFFICIAL_DEPARTMENTS, type Role, type Action } from '@/types';
import { useAuth } from '@/context/AuthContext';

const baseStatusConfig: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  pending: { label: 'Pending', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', icon: Clock },
  planned: { label: 'Planned', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', icon: Clock },
  in_progress: { label: 'In Progress', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', icon: AlertCircle },
  completed: { label: 'Completed', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: CheckCircle },
  verified: { label: 'Verified', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: CheckCircle },
  overdue: { label: 'Overdue', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20', icon: AlertCircle },
  cancelled: { label: 'Cancelled', color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-700/30', icon: AlertCircle },
};

const defaultStatusConfig = {
  label: 'Planned',
  color: 'text-blue-600 dark:text-blue-400',
  bg: 'bg-blue-50 dark:bg-blue-900/20',
  icon: Clock,
};

function getStatusConfig(status?: string) {
  const key = (status || '').toLowerCase();
  return baseStatusConfig[key] || {
    ...defaultStatusConfig,
    label: (status || 'Planned').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
  };
}

export function ActionsPage({ role }: { role: Role }) {
  const { user } = useAuth();
  // Phase 6D: Management is strictly a monitoring/read-only role
  const isReadOnly = role === 'student' || role === 'faculty' || role === 'management';

  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [filter, setFilter] = useState<string>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [editingAction, setEditingAction] = useState<Action | null>(null);
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const navigate = useNavigate();

  // Effective department resolution
  const effectiveDept = role === 'hod'
    ? user?.department
    : role === 'management'
      ? (selectedDept !== 'ALL' ? selectedDept : undefined)
      : (user?.department || undefined);

  const [actions, setActions] = useState(() => getAllActions(effectiveDept));
  const issues = getAllIssues(effectiveDept);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const live = await fetchActions(effectiveDept);
        if (mounted) setActions(live);
      } catch {
        if (mounted) setActions(getAllActions(effectiveDept));
      }
    }
    load();
    const unsub = subscribeActionChange(newActions => {
      if (mounted) setActions(newActions);
    });
    return () => {
      mounted = false;
      unsub();
    };
  }, [effectiveDept]);

  // Combined Filtering: Status + Priority
  const filtered = actions.filter(a => {
    if (filter !== 'all' && a.status !== filter) return false;
    if (priorityFilter !== 'all' && a.priority !== priorityFilter) return false;
    return true;
  });

  const refresh = () => setActions(getAllActions(effectiveDept));

  const handleCardClick = async (act: Action) => {
    setSelectedAction(act);
    setLoadingDetail(true);
    try {
      const full = await fetchActionById(act.id);
      if (full) {
        setSelectedAction(full);
      }
    } catch (err) {
      console.warn('[ActionsPage] Could not load full action detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {role === 'management' ? 'Institution Action Monitoring' : isReadOnly ? 'Department Action Progress' : 'Action Center'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {role === 'management'
              ? `Monitoring corrective actions from HODs across the institution ${selectedDept !== 'ALL' ? `· ${selectedDept}` : '· Institution-wide'}`
              : isReadOnly
                ? `Tracking corrective actions and progress for ${effectiveDept || 'your department'}`
                : `Manage corrective actions from planning to impact measurement ${effectiveDept ? `· ${effectiveDept}` : '· Institution-wide'}`}
          </p>
        </div>
        {!isReadOnly && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            Create Action
          </Button>
        )}
      </div>

      {/* Stats - Full 6 status categories including pending */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {(['pending', 'planned', 'in_progress', 'completed', 'overdue', 'cancelled'] as const).map(status => {
          const cfg = getStatusConfig(status);
          const Icon = cfg.icon;
          const count = actions.filter(a => a.status === status).length;
          const isSelected = filter === status;
          return (
            <Card
              key={status}
              className={`p-3.5 cursor-pointer transition-all ${isSelected ? 'ring-2 ring-blue-500 shadow-sm bg-blue-50/20 dark:bg-blue-900/10' : ''}`}
              hover
              onClick={() => setFilter(filter === status ? 'all' : status)}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Icon size={14} className={cfg.color} />
                <span className="text-xs text-slate-400 font-medium truncate">{cfg.label}</span>
              </div>
              <p className={`text-xl font-bold ${cfg.color}`}>{count}</p>
            </Card>
          );
        })}
      </div>

      {/* Filters Bar: Status Buttons + Management Department Filter + Priority Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        {/* Status filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${filter === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}
          >
            All Actions ({actions.length})
          </button>
          {(['pending', 'planned', 'in_progress', 'completed', 'overdue', 'cancelled'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${filter === s ? 'bg-blue-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}
            >
              {getStatusConfig(s).label}
            </button>
          ))}
        </div>

        {/* Department (for Management) & Priority Selectors */}
        <div className="flex items-center gap-2.5">
          {role === 'management' && (
            <div className="flex items-center gap-1.5">
              <Building2 size={14} className="text-slate-400" />
              <select
                value={selectedDept}
                onChange={e => setSelectedDept(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm cursor-pointer"
              >
                <option value="ALL">All Departments</option>
                {OFFICIAL_DEPARTMENTS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <Tag size={14} className="text-slate-400" />
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm cursor-pointer"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Actions list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<CheckSquare size={48} />}
          title="No actions in this category"
          message={isReadOnly ? "No actions recorded under this filter." : "Create a new action or change the filter."}
          actionLabel={isReadOnly ? undefined : "Create Action"}
          onAction={isReadOnly ? undefined : () => setShowCreate(true)}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(action => {
            const cfg = getStatusConfig(action.status);
            const Icon = cfg.icon;
            return (
              <Card key={action.id} className="p-5" hover onClick={() => handleCardClick(action)}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${cfg.bg}`}>
                      <Icon size={15} className={cfg.color} />
                    </div>
                    <Badge variant={action.status === 'completed' || action.status === 'verified' ? 'success' : action.status === 'overdue' ? 'critical' : action.status === 'in_progress' || action.status === 'pending' ? 'warning' : 'info'}>
                      {cfg.label}
                    </Badge>
                    {action.priority && (
                      <Badge variant={action.priority === 'critical' ? 'critical' : action.priority === 'high' ? 'high' : action.priority === 'medium' ? 'medium' : 'low'} className="text-[10px] uppercase font-semibold">
                        {action.priority}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                      <Building2 size={11} className="mr-1 inline text-slate-400" />
                      {action.department}
                    </Badge>
                  </div>
                  {!isReadOnly && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingAction(action); }}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors"
                      title="Edit Action"
                    >
                      <Edit size={14} />
                    </button>
                  )}
                </div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">{action.action}</h3>
                <p className="text-xs text-slate-400 mb-3">
                  {action.issueTitle ? `For: ${action.issueTitle}` : 'Department Action (Standalone)'}
                </p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <User size={12} /> {action.assignedTo || 'Unassigned'}
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <Calendar size={12} /> Due: {action.deadline ? new Date(action.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
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

      {/* Create Action Modal (HOD only) */}
      {!isReadOnly && (
        <CreateActionModal open={showCreate} onClose={() => setShowCreate(false)} issues={issues} onCreated={() => { refresh(); setShowCreate(false); }} />
      )}

      {/* Edit Action Modal (HOD only) */}
      {!isReadOnly && (
        <EditActionModal action={editingAction} onClose={() => setEditingAction(null)} onSaved={() => { refresh(); setEditingAction(null); }} />
      )}

      {/* Action Detail Modal with Impact & Progress Updates */}
      <Modal open={!!selectedAction} onClose={() => setSelectedAction(null)} title="Action Details" size="lg">
        {selectedAction && (
          <ActionDetail
            action={selectedAction}
            loading={loadingDetail}
            role={role}
            onViewImpact={() => navigate(`/${role}/actions/${selectedAction.id}`)}
          />
        )}
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
    if (!action || !assignedTo || !deadline) return;
    createAction({
      issueId: issue ? issue.id : undefined,
      issueTitle: issue ? issue.title : 'Department Action',
      possibleCause: possibleCause || (issue ? 'To be determined' : 'Departmental Initiative'),
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
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Related Issue (Optional)</label>
          <select value={issueId} onChange={e => setIssueId(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
            <option value="">No linked issue (Standalone / Department Action)</option>
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
          <Button onClick={handleSubmit} disabled={!action || !assignedTo || !deadline}>Create Action</Button>
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

function ActionDetail({
  action,
  loading,
  role,
  onViewImpact
}: {
  action: Action;
  loading?: boolean;
  role: Role;
  onViewImpact: () => void;
}) {
  const cfg = getStatusConfig(action.status);
  return (
    <div className="space-y-4">
      {/* Top Badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant={action.status === 'completed' || action.status === 'verified' ? 'success' : action.status === 'overdue' ? 'critical' : action.status === 'in_progress' || action.status === 'pending' ? 'warning' : 'info'}>
          {cfg.label}
        </Badge>
        {action.priority && (
          <Badge variant={action.priority === 'critical' ? 'critical' : action.priority === 'high' ? 'high' : action.priority === 'medium' ? 'medium' : 'low'} className="text-[10px] uppercase font-semibold">
            {action.priority}
          </Badge>
        )}
        <Badge variant="default" className="text-xs font-medium">
          <Building2 size={12} className="mr-1 inline" />
          {action.department}
        </Badge>
      </div>

      {/* Title & Description */}
      <div>
        <p className="text-xs text-slate-400 mb-0.5">Action Title</p>
        <p className="text-base font-semibold text-slate-800 dark:text-slate-100">{action.action}</p>
        {action.description && (
          <div className="mt-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
            {action.description}
          </div>
        )}
      </div>

      {/* Key Fields Grid */}
      <div className="grid grid-cols-2 gap-3.5 text-xs bg-slate-50/50 dark:bg-slate-800/30 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
        <div>
          <p className="text-[11px] text-slate-400 mb-0.5">Linked Issue / Origin</p>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {action.issueTitle || 'Department Action (Standalone)'}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-slate-400 mb-0.5">Possible Cause</p>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {action.possibleCause || 'Investigation required'}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-slate-400 mb-0.5">Assigned To</p>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {action.assignedTo || 'Unassigned'}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-slate-400 mb-0.5">Due Date</p>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {action.deadline ? new Date(action.deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-slate-400 mb-0.5">Created Date</p>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {action.createdAt ? new Date(action.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-slate-400 mb-0.5">Completion Date</p>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {action.completedAt ? new Date(action.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
          </p>
        </div>
      </div>

      {/* Optional Notes */}
      {action.notes && (
        <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/30">
          <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 mb-0.5">Action Notes</p>
          <p className="text-xs text-slate-600 dark:text-slate-300">{action.notes}</p>
        </div>
      )}

      {/* Progress History & Audit Trail */}
      <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5 flex items-center gap-1.5">
          <History size={14} className="text-blue-500" />
          Progress History & Audit Trail
        </h4>
        {loading ? (
          <div className="py-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <Loader2 size={14} className="animate-spin text-blue-500" />
            Loading audit updates...
          </div>
        ) : action.updates && action.updates.length > 0 ? (
          <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
            {action.updates.map((u, idx) => (
              <div key={u.id || idx} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{u.createdBy || 'Authorized User'}</span>
                  <span className="text-[11px] text-slate-400">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </span>
                </div>
                {u.newStatus && (
                  <div className="flex items-center gap-1.5 mb-1 text-[11px]">
                    {u.previousStatus && (
                      <>
                        <span className="capitalize text-slate-400">{u.previousStatus.replace('_', ' ')}</span>
                        <ArrowRight size={10} className="text-slate-400" />
                      </>
                    )}
                    <Badge variant="info" className="text-[10px] py-0">{u.newStatus.replace('_', ' ')}</Badge>
                  </div>
                )}
                <p className="text-slate-600 dark:text-slate-300 text-xs">{u.updateText}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">No progress updates recorded yet.</p>
        )}
      </div>

      {/* Impact Section */}
      {action.impact ? (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50">
          <div className="flex items-center gap-2 mb-1.5">
            <TrendingUp size={16} className="text-emerald-500" />
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Improvement Detected</p>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Negative feedback reduced from {action.impact.beforeNegative}% to {action.impact.afterNegative}% (+{action.impact.improvement} percentage points)
          </p>
          <Button variant="outline" size="sm" className="mt-2.5 text-xs" onClick={onViewImpact}>
            View Impact Tracking <ArrowRight size={12} className="ml-1" />
          </Button>
        </div>
      ) : (
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-700/30">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            No impact data yet. Impact will be measured once the action is completed.
          </p>
        </div>
      )}
    </div>
  );
}
