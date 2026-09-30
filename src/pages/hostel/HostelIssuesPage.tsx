import { useState, useEffect } from 'react';
import { Card, Badge, SeverityBadge, StatusBadge, Button } from '@/components/common/UI';
import { useAuth } from '@/context/AuthContext';
import { useHostelScope } from '@/context/HostelScopeContext';
import { HostelScopeSelector } from '@/components/hostel/HostelScopeSelector';
import { fetchIssues, type Issue } from '@/services/issueService';
import { createAction } from '@/services/actionService';
import {
  Home,
  AlertTriangle,
  CheckSquare,
  Clock,
  ChevronRight,
  Loader2,
  CheckCircle,
  Plus,
  Wrench
} from 'lucide-react';

export function HostelIssuesPage() {
  const { user } = useAuth();
  const { selectedFloor, effectiveFloor, selectedFloorDisplay, isAllFloors } = useHostelScope();
  const isHostelWarden = user?.role === 'hostel_warden';
  const isManagement = user?.role === 'management';

  const userFloor = isManagement
    ? selectedFloorDisplay
    : (user?.assigned_floor || user?.floor || '1st Floor');

  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  // New action modal / inline form
  const [actionTitle, setActionTitle] = useState('');
  const [actionAssignee, setActionAssignee] = useState('');
  const [actionDeadline, setActionDeadline] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(false);

  const loadIssues = async () => {
    try {
      setLoading(true);
      const filters: Record<string, any> = { portal: 'hostel' };
      if (isHostelWarden && user?.assigned_floor) {
        filters.floor = user.assigned_floor;
      } else if (isManagement && effectiveFloor) {
        filters.floor = effectiveFloor;
      }
      const data = await fetchIssues(null, filters);
      const scoped = effectiveFloor
        ? data.filter(i => !i.floor || i.floor.trim().toLowerCase() === effectiveFloor.trim().toLowerCase())
        : data;
      setIssues(scoped);
      if (scoped.length > 0) {
        setSelectedIssue(prev => (prev && scoped.some(i => i.id === prev.id) ? prev : scoped[0]));
      } else {
        setSelectedIssue(null);
      }
    } catch (err: any) {
      console.error('[HostelIssuesPage] Failed to fetch issues:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIssues();
  }, [user?.role, user?.assigned_floor, effectiveFloor, isManagement]);

  const handleCreateAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue || !actionTitle.trim()) return;

    setActionSubmitting(true);
    try {
      await createAction({
        action: actionTitle.trim(),
        issueId: selectedIssue.id,
        issueTitle: selectedIssue.title,
        possibleCause: selectedIssue.title,
        portal: 'hostel',
        floor: (selectedIssue.floor || userFloor) as any,
        department: null as any,
        assignedTo: actionAssignee.trim() || 'Floor Maintenance Team',
        deadline: actionDeadline || new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
        status: 'planned',
        priority: selectedIssue.severity === 'high' ? 'high' : 'medium',
        description: `Corrective maintenance planned for hostel issue: ${selectedIssue.title}`,
      });

      setActionSuccess(true);
      setActionTitle('');
      setTimeout(() => setActionSuccess(false), 2000);
    } catch (err: any) {
      console.error('[HostelIssuesPage] Create action error:', err);
    } finally {
      setActionSubmitting(false);
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
            Hostel Facility Issues
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {isHostelWarden
              ? `Maintenance issues detected on ${userFloor}. Backend enforces assigned floor isolation.`
              : 'Institutional hostel facility issues across all residence floors.'}
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
          <p className="text-sm font-medium">Loading hostel issues...</p>
        </div>
      ) : issues.length === 0 ? (
        <div className="py-20 text-center text-slate-400 rounded-2xl bg-white/[0.02] border border-white/10">
          <CheckCircle size={44} className="mx-auto mb-3 text-emerald-400 opacity-60" />
          <p className="text-base font-semibold text-white">No active issues detected for this floor.</p>
          <p className="text-xs text-slate-500 mt-1">Facility maintenance patterns report normal operations.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Issue List */}
          <div className="lg:col-span-1 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Reported Issues ({issues.length})
            </p>
            {issues.map(iss => {
              const isSelected = selectedIssue?.id === iss.id;
              return (
                <div
                  key={iss.id}
                  onClick={() => setSelectedIssue(iss)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-purple-500/15 border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.2)]'
                      : 'bg-white/[0.02] border-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-semibold text-purple-400">{iss.category}</span>
                    <SeverityBadge severity={iss.severity} />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-2 line-clamp-2">{iss.title}</h3>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{iss.complaintCount} reports</span>
                    <StatusBadge status={iss.status} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Issue Detail & Action Launch */}
          <div className="lg:col-span-2 space-y-6">
            {selectedIssue ? (
              <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-6 md:p-8 backdrop-blur-xl space-y-6">
                <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="neutral" className="font-mono text-xs">
                        {selectedIssue.floor || userFloor}
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
                    <p className="text-xs text-slate-400">Reported By</p>
                    <p className="text-xl font-bold text-white mt-1">{selectedIssue.complaintCount}</p>
                    <p className="text-[11px] text-slate-500">Residents</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                    <p className="text-xs text-slate-400">Target Floor</p>
                    <p className="text-xl font-bold text-purple-400 mt-1 font-mono">{selectedIssue.floor || userFloor}</p>
                    <p className="text-[11px] text-slate-500">Assigned Scope</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                    <p className="text-xs text-slate-400">Urgency Level</p>
                    <p className="text-xl font-bold text-red-400 mt-1 capitalize">{selectedIssue.severity}</p>
                    <p className="text-[11px] text-slate-500">Facility Priority</p>
                  </div>
                </div>

                {/* Corrective Action Launch Form (Warden / Management) */}
                {(isHostelWarden || isManagement) && (
                  <div className="rounded-xl bg-gradient-to-r from-purple-500/10 via-transparent to-transparent border border-purple-500/20 p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
                        <Wrench size={16} />
                      </div>
                      <h3 className="text-sm font-bold text-white">Create Hostel Corrective Action</h3>
                    </div>

                    <form onSubmit={handleCreateAction} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">
                          Corrective Action / Repair Plan
                        </label>
                        <input
                          type="text"
                          value={actionTitle}
                          onChange={(e) => setActionTitle(e.target.value)}
                          placeholder="e.g. Replace faulty plumbing fixture in 2nd Floor north restroom..."
                          className="w-full bg-[#04050c]/80 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-400/50"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">
                            Assigned Maintenance Staff
                          </label>
                          <input
                            type="text"
                            value={actionAssignee}
                            onChange={(e) => setActionAssignee(e.target.value)}
                            placeholder="e.g. Electrical Supervisor / Plumber Lead"
                            className="w-full bg-[#04050c]/80 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400/50"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">
                            Target Completion Date
                          </label>
                          <input
                            type="date"
                            value={actionDeadline}
                            onChange={(e) => setActionDeadline(e.target.value)}
                            className="w-full bg-[#04050c]/80 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-purple-400/50"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        {actionSuccess && (
                          <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                            <CheckCircle size={14} /> Corrective repair action scheduled!
                          </span>
                        )}
                        <Button
                          type="submit"
                          disabled={actionSubmitting || !actionTitle.trim()}
                          className="ml-auto flex items-center gap-2"
                        >
                          <Plus size={16} />
                          {actionSubmitting ? 'Scheduling...' : 'Launch Repair Action'}
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
