import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, Badge, StatusBadge, SentimentBadge, Button } from '@/components/common/UI';
import { AnimatedCounter } from '@/components/common/AnimatedCounter';
import { useAuth } from '@/context/AuthContext';
import { useHostelScope } from '@/context/HostelScopeContext';
import { HostelScopeSelector } from '@/components/hostel/HostelScopeSelector';
import { fetchFeedback, type Feedback } from '@/services/feedbackService';
import { fetchIssues, type Issue } from '@/services/issueService';
import { fetchActions, type Action } from '@/services/actionService';
import {
  Home,
  Building,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  TrendingUp,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Calendar,
  Layers,
  Loader2,
  Users,
  Wrench,
  Eye,
  Camera
} from 'lucide-react';
import { ImageLightboxModal } from '@/components/common/ImageUpload';

export function HostelDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [issuesList, setIssuesList] = useState<Issue[]>([]);
  const [actionsList, setActionsList] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImageFeedback, setSelectedImageFeedback] = useState<Feedback | null>(null);

  const { selectedFloor, effectiveFloor, selectedFloorDisplay, isAllFloors } = useHostelScope();

  const isStudent = user?.role === 'student';
  const isHostelWarden = user?.role === 'hostel_warden';
  const isManagement = user?.role === 'management';

  const userFloor = isManagement
    ? selectedFloorDisplay
    : (user?.floor || user?.assigned_floor || 'Not Assigned');

  const roomNumber = isStudent ? (user?.room_number || 'Room unassigned') : null;
  const contextLabel = isManagement ? 'Campus Scope' : 'Assigned Floor';

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        setLoading(true);
        const filters: Record<string, any> = { portal: 'hostel' };
        if (isHostelWarden && user?.assigned_floor) {
          filters.floor = user.assigned_floor;
        } else if (isManagement && effectiveFloor) {
          filters.floor = effectiveFloor;
        }

        const [fb, iss, acts] = await Promise.all([
          fetchFeedback(filters).catch(() => []),
          fetchIssues(null, filters).catch(() => []),
          fetchActions(null, filters).catch(() => [])
        ]);

        if (mounted) {
          const scopedFb = effectiveFloor
            ? fb.filter(f => !f.floor || f.floor.trim().toLowerCase() === effectiveFloor.trim().toLowerCase())
            : fb;
          const scopedIss = effectiveFloor
            ? iss.filter(i => !i.floor || i.floor.trim().toLowerCase() === effectiveFloor.trim().toLowerCase())
            : iss;
          const scopedActs = effectiveFloor
            ? acts.filter(a => !a.floor || a.floor.trim().toLowerCase() === effectiveFloor.trim().toLowerCase())
            : acts;

          setFeedbackList(scopedFb);
          setIssuesList(scopedIss);
          setActionsList(scopedActs);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadData();
    return () => { mounted = false; };
  }, [user?.role, user?.assigned_floor, effectiveFloor, isManagement]);

  // Metrics
  const totalFeedback = feedbackList.length;
  const positiveCount = feedbackList.filter(f => f.sentiment === 'positive').length;
  const satisfactionRate = totalFeedback > 0 ? Math.round((positiveCount / totalFeedback) * 100) : 88;
  const activeIssues = issuesList.filter(i => i.status !== 'resolved');
  const openActions = actionsList.filter(a => a.status !== 'completed' && a.status !== 'verified');

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-visible rounded-3xl bg-gradient-to-br from-purple-500/20 via-indigo-600/10 to-transparent border border-purple-500/20 p-8 shadow-[0_0_50px_rgba(168,85,247,0.15)] z-20">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                <Home size={14} />
                Hostel Facilities Intelligence
              </span>
              <span className="text-xs text-slate-400">Portal: Hostel</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-purple-200 bg-clip-text text-transparent">
              {isStudent ? 'Hostel Resident Portal' : isHostelWarden ? `Warden: ${userFloor}` : 'Hostel Overview (Management)'}
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-xl">
              {isStudent
                ? 'Report room maintenance, hygiene, water, wifi, and view floor notices.'
                : isHostelWarden
                ? `Monitor floor complaints, maintenance requests, safety alerts, and manage corrective actions for ${userFloor}.`
                : 'Institutional oversight of campus residential facilities, floor maintenance, and living condition corrective actions.'}
            </p>
          </div>

          {/* Quick Context Card / Scope Selector */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {(isManagement || isHostelWarden) && (
              <HostelScopeSelector />
            )}
            <div className="flex items-center gap-4 bg-black/40 backdrop-blur-md px-5 py-3.5 rounded-2xl border border-white/10">
              <div className="h-11 w-11 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Home size={22} />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">{contextLabel}</p>
                <p className="text-base font-bold text-white tracking-wide">{userFloor}</p>
                {roomNumber && (
                  <p className="text-xs text-purple-400/90 flex items-center gap-1 mt-0.5 font-mono">
                    {roomNumber}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl group hover:border-purple-500/40 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Feedback</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <MessageSquare size={18} />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white">
            <AnimatedCounter value={totalFeedback} />
          </div>
          <p className="text-xs text-slate-400 mt-2">Resident feedback submissions</p>
        </div>

        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Satisfaction Rate</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-emerald-400">
            <AnimatedCounter value={satisfactionRate} />%
          </div>
          <p className="text-xs text-slate-400 mt-2">{positiveCount} satisfied residents</p>
        </div>

        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl group hover:border-red-500/40 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Maintenance Issues</span>
            <div className="p-2 rounded-xl bg-red-500/10 text-red-400">
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-red-400">
            <AnimatedCounter value={activeIssues.length} />
          </div>
          <p className="text-xs text-slate-400 mt-2">Requires warden attention</p>
        </div>

        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl group hover:border-blue-500/40 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Corrective Actions</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <CheckCircle size={18} />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-blue-400">
            <AnimatedCounter value={openActions.length} />
          </div>
          <p className="text-xs text-slate-400 mt-2">Work orders in progress</p>
        </div>
      </div>

      {/* Main Grid: Feedback & Floor Scope */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {isStudent && (
            <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-500/15 via-indigo-500/10 to-transparent border border-purple-500/30 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-white">Have a hostel maintenance request or feedback?</h3>
                <p className="text-xs text-slate-400 mt-1">Submit reports on room repairs, water supply, electricity, hygiene, or Wi-Fi.</p>
              </div>
              <Button
                variant="primary"
                onClick={() => navigate('/hostel/feedback')}
                className="whitespace-nowrap flex items-center gap-2"
              >
                <MessageSquare size={16} />
                Submit Feedback
              </Button>
            </div>
          )}

          {/* Recent Feedback */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Recent Floor Feedback</h2>
                  <p className="text-xs text-slate-400">Resident submissions for {userFloor}</p>
                </div>
              </div>
              <Link to="/hostel/feedback" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-medium transition-colors">
                View all <ChevronRight size={14} />
              </Link>
            </div>

            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                <Loader2 size={28} className="animate-spin text-purple-400 mb-2" />
                <p className="text-xs">Loading hostel feedback...</p>
              </div>
            ) : feedbackList.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Home size={36} className="mx-auto mb-3 opacity-30 text-purple-400" />
                <p className="text-sm font-medium">No hostel feedback recorded yet.</p>
                <p className="text-xs text-slate-500 mt-1">Resident reports will appear here automatically.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {feedbackList.slice(0, 5).map((fb) => (
                  <div
                    key={fb.id}
                    className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/15 transition-all"
                  >
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="neutral" className="text-xs font-mono">
                          {fb.floor || userFloor}
                        </Badge>
                        <span className="text-xs font-medium text-slate-300">{fb.category}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {(fb.imageUrl || fb.image_url) && (
                          <button
                            type="button"
                            onClick={() => setSelectedImageFeedback(fb)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 hover:text-white border border-purple-500/40 hover:border-purple-400 transition-all shadow-sm active:scale-95 cursor-pointer"
                            title="View student uploaded image along with feedback"
                          >
                            <Eye size={12} />
                            <span>View Image</span>
                          </button>
                        )}
                        <SentimentBadge sentiment={fb.sentiment} />
                        <StatusBadge status={fb.status} />
                      </div>
                    </div>
                    <p className="text-sm text-slate-300 line-clamp-2">{fb.comment}</p>
                    {(fb.imageUrl || fb.image_url) && (
                      <div className="mt-2.5">
                        <button
                          type="button"
                          onClick={() => setSelectedImageFeedback(fb)}
                          className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/25 hover:border-purple-500/40 text-xs text-purple-300 transition-all group/img cursor-pointer"
                        >
                          <Camera size={13} className="text-purple-400 group-hover/img:scale-110 transition-transform" />
                          <span className="font-medium">Attached photo evidence</span>
                          <span className="text-[11px] underline opacity-80 group-hover/img:opacity-100">Click to view</span>
                        </button>
                      </div>
                    )}
                    <p className="text-[11px] text-slate-500 mt-2 font-mono">
                      {new Date(fb.date).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Quick Links */}
        <div className="space-y-6">
          <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-6 backdrop-blur-xl">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Home size={16} className="text-purple-400" />
              Room & Floor Allocation
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-slate-400">Floor Level</span>
                <span className="font-semibold text-white">{userFloor}</span>
              </div>
              {isStudent && (
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-slate-400">Room Number</span>
                  <span className="font-semibold text-white font-mono">{roomNumber}</span>
                </div>
              )}
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-slate-400">Facility Status</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Operational
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-400">Department Scope</span>
                <span className="text-xs font-mono text-purple-400">Non-academic (NULL)</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-6 backdrop-blur-xl">
            <h3 className="text-sm font-bold text-white mb-3">Hostel Quick Access</h3>
            <div className="space-y-2">
              <Link
                to="/hostel/feedback"
                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 text-sm text-slate-300 hover:text-white transition-all"
              >
                <span className="flex items-center gap-2.5">
                  <MessageSquare size={16} className="text-purple-400" />
                  {isStudent ? 'Submit Hostel Feedback' : 'Floor Feedback'}
                </span>
                <ChevronRight size={14} className="text-slate-500" />
              </Link>
              <Link
                to="/hostel/issues"
                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 text-sm text-slate-300 hover:text-white transition-all"
              >
                <span className="flex items-center gap-2.5">
                  <AlertTriangle size={16} className="text-red-400" />
                  Maintenance Issues ({activeIssues.length})
                </span>
                <ChevronRight size={14} className="text-slate-500" />
              </Link>
              {!isStudent && (
                <Link
                  to="/hostel/actions"
                  className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 text-sm text-slate-300 hover:text-white transition-all"
                >
                  <span className="flex items-center gap-2.5">
                    <Wrench size={16} className="text-blue-400" />
                    Corrective Actions ({openActions.length})
                  </span>
                  <ChevronRight size={14} className="text-slate-500" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Modal for viewing student feedback photo & details */}
      {selectedImageFeedback && (
        <ImageLightboxModal
          isOpen={Boolean(selectedImageFeedback)}
          imageUrl={selectedImageFeedback.imageUrl || selectedImageFeedback.image_url}
          title={`${selectedImageFeedback.floor || userFloor} · ${selectedImageFeedback.category}`}
          feedback={{
            id: selectedImageFeedback.id,
            comment: selectedImageFeedback.comment,
            sentiment: selectedImageFeedback.sentiment,
            status: selectedImageFeedback.status,
            category: selectedImageFeedback.category,
            scope: selectedImageFeedback.floor || userFloor,
            date: selectedImageFeedback.date,
            anonymous: selectedImageFeedback.anonymous,
            portal: 'hostel'
          }}
          onClose={() => setSelectedImageFeedback(null)}
        />
      )}
    </div>
  );
}
