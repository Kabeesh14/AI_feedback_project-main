import { useState, useEffect } from 'react';
import { Card, Badge, StatusBadge, Button } from '@/components/common/UI';
import { useAuth } from '@/context/AuthContext';
import { useHostelScope } from '@/context/HostelScopeContext';
import { HostelScopeSelector } from '@/components/hostel/HostelScopeSelector';
import { fetchActions, updateAction, type Action } from '@/services/actionService';
import {
  Home,
  Wrench,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  User,
  Loader2,
  TrendingUp
} from 'lucide-react';

export function HostelActionsPage() {
  const { user } = useAuth();
  const { selectedFloor, effectiveFloor, selectedFloorDisplay, isAllFloors } = useHostelScope();
  const isHostelWarden = user?.role === 'hostel_warden';
  const isManagement = user?.role === 'management';

  const userFloor = isManagement
    ? selectedFloorDisplay
    : (user?.assigned_floor || user?.floor || '1st Floor');

  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);

  const loadActions = async () => {
    try {
      setLoading(true);
      const filters: Record<string, any> = { portal: 'hostel' };
      if (isHostelWarden && user?.assigned_floor) {
        filters.floor = user.assigned_floor;
      } else if (isManagement && effectiveFloor) {
        filters.floor = effectiveFloor;
      }
      const data = await fetchActions(null, filters);
      const scoped = effectiveFloor
        ? data.filter(a => !a.floor || a.floor.trim().toLowerCase() === effectiveFloor.trim().toLowerCase())
        : data;
      setActions(scoped);
    } catch (err: any) {
      console.error('[HostelActionsPage] Failed to fetch actions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActions();
  }, [user?.role, user?.assigned_floor, effectiveFloor, isManagement]);

  const handleStatusChange = async (actionId: string, newStatus: string) => {
    try {
      await updateAction(actionId, { status: newStatus as any });
      await loadActions();
    } catch (err: any) {
      console.error('[HostelActionsPage] Status update failed:', err);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-400 uppercase tracking-wider mb-1">
            <Home size={14} />
            <span>Hostel Maintenance Tracking</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">
            Hostel Corrective Actions
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {isHostelWarden
              ? `Maintenance work orders and corrective tasks assigned to ${userFloor}.`
              : 'Institutional residence facility maintenance tasks across all hostel floors.'}
          </p>
        </div>

        {isManagement ? (
          <HostelScopeSelector />
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/25 text-xs text-purple-300 font-semibold">
            <Home size={14} />
            <span>Scope: {userFloor}</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 size={32} className="animate-spin text-purple-400 mb-3" />
          <p className="text-sm font-medium">Loading hostel actions...</p>
        </div>
      ) : actions.length === 0 ? (
        <div className="py-20 text-center text-slate-400 rounded-2xl bg-white/[0.02] border border-white/10">
          <CheckCircle size={44} className="mx-auto mb-3 text-emerald-400 opacity-60" />
          <p className="text-base font-semibold text-white">No active hostel actions registered.</p>
          <p className="text-xs text-slate-500 mt-1">Actions created from resident issues will appear here for progress monitoring.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {actions.map((act) => (
            <div
              key={act.id}
              className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-purple-500/30 transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <Badge variant="neutral" className="text-xs font-mono">
                    {act.floor || userFloor}
                  </Badge>
                  <StatusBadge status={act.status} />
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
                  <span className="font-mono text-purple-400">{act.deadline}</span>
                </div>

                {/* Quick Status Control for Warden */}
                {isHostelWarden && (
                  <div className="pt-2 flex items-center gap-2">
                    <span className="text-[11px] text-slate-500">Update:</span>
                    <select
                      value={act.status}
                      onChange={(e) => handleStatusChange(act.id, e.target.value)}
                      className="bg-[#04050c]/80 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-purple-400"
                    >
                      <option value="pending">Pending</option>
                      <option value="planned">Planned</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="verified">Verified</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
