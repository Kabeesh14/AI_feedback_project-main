import { useState, useEffect } from 'react';
import { Card, Badge, StatusBadge, Button } from '@/components/common/UI';
import { useAuth } from '@/context/AuthContext';
import { useBusScope } from '@/context/BusScopeContext';
import { BusScopeSelector } from '@/components/bus/BusScopeSelector';
import type { Action } from '@/types';
import { fetchActions, updateAction } from '@/services/actionService';
import {
  Bus,
  CheckSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  User,
  Loader2,
  TrendingUp,
  CheckCircle2
} from 'lucide-react';

export function BusActionsPage() {
  const { user } = useAuth();
  const { selectedBus, effectiveBusNumber, isAllBuses } = useBusScope();

  const isBusIncharge = user?.role === 'bus_incharge';
  const isTransportIncharge = user?.role === 'transport_incharge';
  const isManagement = user?.role === 'management';
  const userBusNumber = user?.bus_number || 'Bus 14';

  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusFeedback, setStatusFeedback] = useState<{ id: string; message: string } | null>(null);

  const loadActions = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const filters: Record<string, any> = { portal: 'bus' };
      if (isBusIncharge && user?.bus_number) {
        filters.bus_number = user.bus_number;
      } else if (effectiveBusNumber) {
        filters.bus_number = effectiveBusNumber;
      }
      const data = await fetchActions(null, filters);
      const scoped = effectiveBusNumber
        ? data.filter(a => !a.bus_number || a.bus_number.trim().toLowerCase() === effectiveBusNumber.trim().toLowerCase())
        : data;
      setActions(scoped);
    } catch (err: any) {
      console.error('[BusActionsPage] Failed to fetch actions:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadActions(true);
  }, [user?.role, user?.bus_number, effectiveBusNumber]);

  const handleStatusChange = async (actionId: string, newStatus: string) => {
    if (isBusIncharge || (!isTransportIncharge && !isManagement)) return;
    try {
      setUpdatingId(actionId);
      // Instant 0ms optimistic update
      setActions(prev => prev.map(a => a.id === actionId ? { ...a, status: newStatus as any } : a));

      const statusLabels: Record<string, string> = {
        pending: 'Pending',
        in_progress: 'In Progress',
        completed: 'Completed',
      };
      setStatusFeedback({ id: actionId, message: `Status updated to ${statusLabels[newStatus] || newStatus}` });
      setTimeout(() => setStatusFeedback(null), 2500);

      await updateAction(actionId, { status: newStatus as any });
      await loadActions(false);
    } catch (err: any) {
      console.error('[BusActionsPage] Status update failed:', err);
      alert(err.message || 'Failed to update action status');
      await loadActions(false);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">
            <Bus size={14} />
            <span>Transport Corrective Workflows</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">
            Bus Action Tracker
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {isBusIncharge
              ? `Operational corrective actions assigned to ${userBusNumber}.`
              : effectiveBusNumber
              ? `Operational corrective actions assigned to ${effectiveBusNumber}.`
              : 'Corrective maintenance and punctuality improvement actions across all buses.'}
          </p>
        </div>

        <BusScopeSelector />
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 size={32} className="animate-spin text-amber-400 mb-3" />
          <p className="text-sm font-medium">Loading transport actions...</p>
        </div>
      ) : actions.length === 0 ? (
        <div className="py-20 text-center text-slate-400 rounded-2xl bg-white/[0.02] border border-white/10">
          <CheckCircle size={44} className="mx-auto mb-3 text-emerald-400 opacity-60" />
          <p className="text-base font-semibold text-white">No active bus actions registered.</p>
          <p className="text-xs text-slate-500 mt-1">Actions created from bus issues will appear here for tracking.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {actions.map((act) => {
            const canModify = isTransportIncharge || isManagement;
            const feedback = statusFeedback?.id === act.id ? statusFeedback.message : null;
            const isUpdating = updatingId === act.id;

            return (
              <div
                key={act.id}
                className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-500/30 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <Badge variant="neutral" className="text-xs font-mono">
                      {act.bus_number || userBusNumber}
                    </Badge>
                    <div className="flex items-center gap-2">
                      {feedback && (
                        <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1 animate-pulse">
                          <CheckCircle2 size={12} /> {feedback}
                        </span>
                      )}
                      <StatusBadge status={act.status} />
                    </div>
                  </div>
                  <h3 className="text-base font-bold text-white mb-2 leading-snug">{act.action}</h3>
                  <p className="text-xs text-slate-400 line-clamp-3">{act.description}</p>
                </div>

                <div className="space-y-3 pt-3 border-t border-white/5 text-xs text-slate-400">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <User size={13} /> Assigned To:
                    </span>
                    <span className="font-medium text-white">{act.assignedTo}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <Calendar size={13} /> Target Date:
                    </span>
                    <span className="font-mono text-amber-400">{act.deadline}</span>
                  </div>

                  {/* Status Control for Transport/Management or View-Only readout */}
                  {canModify ? (
                    <div className="pt-2 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between bg-black/60 border border-white/10 p-1 rounded-xl shadow-inner">
                        <span className="text-[11px] text-slate-400 px-1.5 font-semibold">Status:</span>
                        <div className="flex items-center gap-1">
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
                                disabled={isUpdating}
                                onClick={() => handleStatusChange(act.id, opt.key)}
                                title={`Set status to ${opt.label}`}
                                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all border ${
                                  isSelected
                                    ? `${opt.active} font-semibold shadow-sm`
                                    : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'
                                } ${isUpdating ? 'opacity-50 cursor-wait' : ''}`}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 flex items-center justify-between bg-white/[0.02] border border-white/10 px-3 py-2 rounded-xl text-xs">
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
            );
          })}
        </div>
      )}
    </div>
  );
}
