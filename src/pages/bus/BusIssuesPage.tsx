import { useState, useEffect } from 'react';
import { Card, Badge, SeverityBadge, StatusBadge, Button } from '@/components/common/UI';
import { useAuth } from '@/context/AuthContext';
import { useBusScope } from '@/context/BusScopeContext';
import { BusScopeSelector } from '@/components/bus/BusScopeSelector';
import type { Issue, Action } from '@/types';
import { fetchIssues } from '@/services/issueService';
import { fetchActions, createAction, updateAction } from '@/services/actionService';
import { isMatchingBus, formatBusDisplay } from '@/utils/busUtils';
import {
  Bus,
  AlertTriangle,
  CheckSquare,
  Clock,
  Sparkles,
  ChevronRight,
  Loader2,
  Filter,
  CheckCircle,
  Plus,
  Calendar,
  User,
  CheckCircle2
} from 'lucide-react';

export function BusIssuesPage() {
  const { user } = useAuth();
  const { selectedBus, effectiveBusNumber, isAllBuses } = useBusScope();

  const isBusIncharge = user?.role === 'bus_incharge';
  const isTransportIncharge = user?.role === 'transport_incharge';
  const isManagement = user?.role === 'management';

  const userBusNumber = user?.bus_number || 'Bus 14';

  const [issues, setIssues] = useState<Issue[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  // New action form state
  const [actionTitle, setActionTitle] = useState('');
  const [actionAssignee, setActionAssignee] = useState('');
  const [actionDeadline, setActionDeadline] = useState('');
  const [actionInitialStatus, setActionInitialStatus] = useState<'pending' | 'in_progress'>('pending');
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(false);

  // Action status update tracking
  const [updatingActionId, setUpdatingActionId] = useState<string | null>(null);
  const [statusFeedback, setStatusFeedback] = useState<{ id: string; message: string } | null>(null);

  const loadData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const filters: Record<string, any> = { portal: 'bus' };
      if (effectiveBusNumber) {
        filters.bus_number = effectiveBusNumber;
      }

      const [issuesData, actionsData] = await Promise.all([
        fetchIssues(null, filters).catch(() => []),
        fetchActions(null, filters).catch(() => []),
      ]);

      const scopedIssues = effectiveBusNumber
        ? issuesData.filter(i => isMatchingBus(i.bus_number, effectiveBusNumber))
        : issuesData;

      const scopedActions = effectiveBusNumber
        ? actionsData.filter(a => isMatchingBus(a.bus_number, effectiveBusNumber))
        : actionsData;

      setIssues(scopedIssues);
      setActions(scopedActions);

      setSelectedIssue(prev => {
        if (!prev) return scopedIssues.length > 0 ? scopedIssues[0] : null;
        const matched = scopedIssues.find(i => String(i.id) === String(prev.id));
        return matched || (scopedIssues.length > 0 ? scopedIssues[0] : null);
      });
    } catch (err: any) {
      console.error('[BusIssuesPage] Failed to load data:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadData(true);
  }, [user?.role, user?.bus_number, effectiveBusNumber]);

  // Permissions for creating actions: Only Transport Incharge & Management
  const canCreateActionForIssue = () => {
    if (isTransportIncharge || isManagement) return true;
    return false;
  };

  // Permissions for modifying action status: Only Transport Incharge & Management (Bus Incharge is strictly view-only)
  const canModifyAction = (_action: Action) => {
    if (isTransportIncharge || isManagement) return true;
    return false;
  };

  const handleUpdateStatus = async (actionId: string, newStatus: string) => {
    if (isBusIncharge || (!isTransportIncharge && !isManagement)) return;
    try {
      setUpdatingActionId(actionId);
      // 1. Immediate 0ms optimistic update
      setActions(prev => prev.map(a => a.id === actionId ? { ...a, status: newStatus as any } : a));

      if (selectedIssue) {
        const nextIssueStatus = newStatus === 'completed' ? 'resolved' : 'action_planned';
        setSelectedIssue(prev => prev ? { ...prev, status: nextIssueStatus as any } : null);
        setIssues(prev => prev.map(i => i.id === selectedIssue.id ? { ...i, status: nextIssueStatus as any } : i));
      }

      const statusLabels: Record<string, string> = {
        pending: 'Pending',
        in_progress: 'In Progress',
        completed: 'Completed',
      };
      setStatusFeedback({ id: actionId, message: `Status updated to ${statusLabels[newStatus] || newStatus}` });
      setTimeout(() => setStatusFeedback(null), 2500);

      // 2. Network persist
      await updateAction(actionId, { status: newStatus as any });

      // 3. Background sync
      await loadData(false);
    } catch (err: any) {
      console.error('[BusIssuesPage] Status update failed:', err);
      alert(err.message || 'Failed to update action status');
    } finally {
      setUpdatingActionId(null);
    }
  };

  const handleCreateAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue || !actionTitle.trim() || !canCreateActionForIssue()) return;

    setActionSubmitting(true);
    try {
      await createAction({
        action: actionTitle.trim(),
        issueId: selectedIssue.id,
        issueTitle: selectedIssue.title,
        possibleCause: selectedIssue.title,
        portal: 'bus',
        bus_number: selectedIssue.bus_number || userBusNumber,
        department: null as any,
        assignedTo: actionAssignee.trim() || `${user?.name || 'Bus Incharge'} (${userBusNumber})`,
        deadline: actionDeadline || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        status: actionInitialStatus,
        priority: selectedIssue.severity === 'high' ? 'high' : 'medium',
        description: `Action planned for bus issue: ${selectedIssue.title}`,
      });

      setActionSuccess(true);
      setActionTitle('');
      setActionAssignee('');
      setActionDeadline('');
      setTimeout(() => setActionSuccess(false), 2500);

      // Reload data so the new action immediately appears in the list
      await loadData(false);
    } catch (err: any) {
      console.error('[BusIssuesPage] Create action error:', err);
      alert(err.message || 'Failed to create corrective action.');
    } finally {
      setActionSubmitting(false);
    }
  };

  // Filter actions associated with the selected issue
  const relatedActions = selectedIssue
    ? actions.filter(a =>
        String(a.issueId) === String(selectedIssue.id) ||
        (isMatchingBus(a.bus_number, selectedIssue.bus_number) && a.issueTitle === selectedIssue.title)
      )
    : [];

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">
            <Bus size={14} />
            <span>Transport Portal</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">
            Bus Issues
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {effectiveBusNumber
              ? `Operational issues detected on ${formatBusDisplay(effectiveBusNumber)}.`
              : 'Transport issues, punctuality delays, and vehicle maintenance requirements across all buses.'}
          </p>
        </div>

        <BusScopeSelector />
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 size={32} className="animate-spin text-amber-400 mb-3" />
          <p className="text-sm font-medium">Loading bus issues...</p>
        </div>
      ) : issues.length === 0 ? (
        <div className="py-20 text-center text-slate-400 rounded-2xl bg-white/[0.02] border border-white/10">
          <CheckCircle size={44} className="mx-auto mb-3 text-emerald-400 opacity-60" />
          <p className="text-base font-semibold text-white">No active issues detected for this bus scope.</p>
          <p className="text-xs text-slate-500 mt-1">Bus feedback patterns show no major recurring complaints.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Issue List */}
          <div className="lg:col-span-1 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Detected Issues ({issues.length})
            </p>
            {issues.map(iss => {
              const isSelected = selectedIssue?.id === iss.id;
              return (
                <div
                  key={iss.id}
                  onClick={() => setSelectedIssue(iss)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                      : 'bg-white/[0.02] border-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-semibold text-amber-400">{iss.category}</span>
                    <SeverityBadge severity={iss.severity} />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-2 line-clamp-2">{iss.title}</h3>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{iss.complaintCount} commuters affected</span>
                    <StatusBadge status={iss.status} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Issue Detail & Action Planning */}
          <div className="lg:col-span-2 space-y-6">
            {selectedIssue ? (
              <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-6 md:p-8 backdrop-blur-xl space-y-6">
                <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="neutral" className="font-mono text-xs">
                        {formatBusDisplay(selectedIssue.bus_number || userBusNumber)}
                      </Badge>
                      <SeverityBadge severity={selectedIssue.severity} />
                      <StatusBadge status={selectedIssue.status} />
                    </div>
                    <h2 className="text-xl font-bold text-white">{selectedIssue.title}</h2>
                  </div>
                </div>

                {/* Impact details */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                    <p className="text-xs text-slate-400">Reported Volume</p>
                    <p className="text-xl font-bold text-white mt-1">{selectedIssue.complaintCount}</p>
                    <p className="text-[11px] text-slate-500">Commuters</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                    <p className="text-xs text-slate-400">Portal Target</p>
                    <p className="text-xl font-bold text-amber-400 mt-1 font-mono">Bus Transport</p>
                    <p className="text-[11px] text-slate-500">No Dept Scope</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                    <p className="text-xs text-slate-400">Severity Level</p>
                    <p className="text-xl font-bold text-red-400 mt-1 capitalize">{selectedIssue.severity}</p>
                    <p className="text-[11px] text-slate-500">Operational Priority</p>
                  </div>
                </div>

                {/* Corrective Actions for this Issue */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
                        <CheckSquare size={16} />
                      </div>
                      <h3 className="text-sm font-bold text-white">
                        Corrective Actions ({relatedActions.length})
                      </h3>
                    </div>
                    {relatedActions.length > 0 && (
                      <span className="text-xs text-slate-400">
                        {relatedActions.filter(a => a.status === 'completed').length} of {relatedActions.length} completed
                      </span>
                    )}
                  </div>

                  {relatedActions.length === 0 ? (
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center text-xs text-slate-400">
                      {canCreateActionForIssue()
                        ? 'No corrective actions planned yet for this issue. Use the form below to launch one.'
                        : 'No corrective actions planned yet for this issue.'}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {relatedActions.map(act => {
                        const canModify = canModifyAction(act);
                        const isCurrentUpdating = updatingActionId === act.id;
                        const feedback = statusFeedback?.id === act.id ? statusFeedback.message : null;

                        return (
                          <div
                            key={act.id}
                            className="p-5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all space-y-3"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant="neutral" className="text-[11px] font-mono">
                                    {formatBusDisplay(act.bus_number || userBusNumber)}
                                  </Badge>
                                  <StatusBadge status={act.status} />
                                  {feedback && (
                                    <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1 animate-pulse">
                                      <CheckCircle2 size={13} /> {feedback}
                                    </span>
                                  )}
                                </div>
                                <h4 className="text-sm font-bold text-white">{act.action}</h4>
                              </div>

                              {/* Action Status: Modifier (Transport/Management) or View-Only Badge (Bus Incharge) */}
                              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                                {canModify ? (
                                  <div className="flex items-center gap-1 bg-black/60 border border-white/10 p-1 rounded-xl shadow-inner">
                                    <span className="text-[11px] text-slate-400 px-1 font-semibold">Status:</span>
                                    {[
                                      { key: 'pending', label: 'Pending', active: 'bg-amber-500/25 text-amber-300 border-amber-500/50' },
                                      { key: 'in_progress', label: 'In Progress', active: 'bg-blue-500/25 text-blue-300 border-blue-500/50' },
                                      { key: 'completed', label: 'Completed', active: 'bg-emerald-500/25 text-emerald-300 border-emerald-500/50' },
                                    ].map(opt => {
                                      const isSelected = act.status === opt.key || (opt.key === 'pending' && act.status === 'planned');
                                      return (
                                        <button
                                          key={opt.key}
                                          type="button"
                                          disabled={isCurrentUpdating}
                                          onClick={() => handleUpdateStatus(act.id, opt.key)}
                                          title={`Set status to ${opt.label}`}
                                          className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all border ${
                                            isSelected
                                              ? `${opt.active} font-semibold shadow-sm`
                                              : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'
                                          } ${isCurrentUpdating ? 'opacity-50 cursor-wait' : ''}`}
                                        >
                                          {opt.label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs shadow-inner">
                                    <span className="text-slate-400 font-medium">Status:</span>
                                    <span className={`px-2.5 py-0.5 rounded-lg font-semibold text-xs border ${
                                      act.status === 'completed'
                                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                        : act.status === 'in_progress'
                                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                    }`}>
                                      {act.status === 'in_progress' ? 'In Progress' : act.status === 'completed' ? 'Completed' : 'Pending'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {act.description && (
                              <p className="text-xs text-slate-400">{act.description}</p>
                            )}

                            <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-white/5 text-xs text-slate-400">
                              <span className="flex items-center gap-1.5">
                                <User size={13} className="text-slate-500" />
                                <span>Lead: <strong className="text-white font-medium">{act.assignedTo}</strong></span>
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Calendar size={13} className="text-slate-500" />
                                <span>Target: <strong className="text-amber-400 font-mono">{act.deadline}</strong></span>
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Corrective Action Launch Form (Authorized roles only: Transport Incharge / Management) */}
                {canCreateActionForIssue() && (
                  <div className="rounded-xl bg-gradient-to-r from-amber-500/10 via-transparent to-transparent border border-amber-500/20 p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                        <Plus size={16} />
                      </div>
                      <h3 className="text-sm font-bold text-white">Create Bus Corrective Action</h3>
                      <span className="text-xs text-amber-300/80 font-mono">({formatBusDisplay(selectedIssue.bus_number || userBusNumber)})</span>
                    </div>

                    <form onSubmit={handleCreateAction} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">
                          Corrective Action Title *
                        </label>
                        <input
                          type="text"
                          value={actionTitle}
                          onChange={(e) => setActionTitle(e.target.value)}
                          placeholder="e.g. Schedule mechanical brake check and adjust morning departure schedule..."
                          className="w-full bg-[#04050c]/80 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/50"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">
                            Assigned Lead
                          </label>
                          <input
                            type="text"
                            value={actionAssignee}
                            onChange={(e) => setActionAssignee(e.target.value)}
                            placeholder={`e.g. ${user?.name || 'Transport Lead'}`}
                            className="w-full bg-[#04050c]/80 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/50"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">
                            Target Deadline
                          </label>
                          <input
                            type="date"
                            value={actionDeadline}
                            onChange={(e) => setActionDeadline(e.target.value)}
                            className="w-full bg-[#04050c]/80 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400/50"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">
                            Initial Status
                          </label>
                          <select
                            value={actionInitialStatus}
                            onChange={(e) => setActionInitialStatus(e.target.value as any)}
                            className="w-full bg-[#04050c]/80 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400/50 cursor-pointer"
                          >
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        {actionSuccess && (
                          <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold animate-pulse">
                            <CheckCircle size={14} /> Corrective action launched and added to list!
                          </span>
                        )}
                        <Button
                          type="submit"
                          disabled={actionSubmitting || !actionTitle.trim()}
                          className="ml-auto flex items-center gap-2"
                        >
                          <Plus size={16} />
                          {actionSubmitting ? 'Scheduling...' : 'Launch Action'}
                        </Button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-20 text-center text-slate-500">
                <p>Select an issue from the left to view details</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
