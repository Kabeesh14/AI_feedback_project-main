import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, Badge, StatusBadge, SentimentBadge, Button } from '@/components/common/UI';
import { AnimatedCounter } from '@/components/common/AnimatedCounter';
import { AIBadge } from '@/components/common/AIExplainer';
import { useAuth } from '@/context/AuthContext';
import { useBusScope } from '@/context/BusScopeContext';
import { BusScopeSelector } from '@/components/bus/BusScopeSelector';
import type { Feedback, Issue, Action } from '@/types';
import { fetchFeedback } from '@/services/feedbackService';
import { isMatchingBus, formatBusDisplay } from '@/utils/busUtils';
import { fetchIssues } from '@/services/issueService';
import { fetchActions } from '@/services/actionService';
import { uploadImage } from '@/services/uploadService';
import { RequiredActionModal } from '@/components/bus/RequiredActionModal';
import {
  Bus,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  TrendingUp,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Calendar,
  Layers,
  ArrowRight,
  Loader2,
  Users,
  Eye,
  Camera,
  CheckSquare,
  Upload
} from 'lucide-react';
import { ImageLightboxModal } from '@/components/common/ImageUpload';

export function BusDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { selectedBus, effectiveBusNumber, isAllBuses } = useBusScope();

  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [issuesList, setIssuesList] = useState<Issue[]>([]);
  const [actionsList, setActionsList] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImageFeedback, setSelectedImageFeedback] = useState<Feedback | null>(null);
  const [requiredActionFeedback, setRequiredActionFeedback] = useState<Feedback | null>(null);
  const [uploadTargetFeedback, setUploadTargetFeedback] = useState<Feedback | null>(null);
  const [uploadingFeedbackId, setUploadingFeedbackId] = useState<string | null>(null);
  const [actionSuccessNotice, setActionSuccessNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTriggerUpload = (fb: Feedback) => {
    setUploadTargetFeedback(fb);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTargetFeedback) return;
    try {
      setUploadingFeedbackId(uploadTargetFeedback.id);
      const result = await uploadImage(file);
      if (result.url) {
        setFeedbackList(prev => prev.map(f => f.id === uploadTargetFeedback.id ? { ...f, imageUrl: result.url, image_url: result.url } : f));
      }
    } catch (err) {
      console.error('[Upload image error]:', err);
      alert('Failed to upload image evidence.');
    } finally {
      setUploadingFeedbackId(null);
      setUploadTargetFeedback(null);
    }
  };

  const isStudent = user?.role === 'student';
  const isBusIncharge = user?.role === 'bus_incharge';
  const isTransportIncharge = user?.role === 'transport_incharge';
  const isManagement = user?.role === 'management';

  const userBusNumber = isManagement || isTransportIncharge || isBusIncharge
    ? (effectiveBusNumber ? formatBusDisplay(effectiveBusNumber) : 'All Buses')
    : (user?.bus_number ? formatBusDisplay(user.bus_number) : 'Not Assigned');

  const boardingPoint = isManagement || isTransportIncharge || isBusIncharge
    ? (user?.boarding_point || 'Institution-wide Routes')
    : (user?.boarding_point || null);

  const contextLabel = isManagement || isTransportIncharge || isBusIncharge ? 'Operational Scope' : 'Assigned Bus';

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        setLoading(true);
        const filters: Record<string, any> = { portal: 'bus' };
        if (effectiveBusNumber) {
          filters.bus_number = effectiveBusNumber;
        }

        const [fb, iss, acts] = await Promise.all([
          fetchFeedback(filters).catch(() => []),
          fetchIssues(null, filters).catch(() => []),
          fetchActions(null, filters).catch(() => [])
        ]);

        if (mounted) {
          const scopedFb = effectiveBusNumber
            ? fb.filter(f => isMatchingBus(f.bus_number, effectiveBusNumber))
            : fb;
          const scopedIss = effectiveBusNumber
            ? iss.filter(i => isMatchingBus(i.bus_number, effectiveBusNumber))
            : iss;
          const scopedActs = effectiveBusNumber
            ? acts.filter(a => isMatchingBus(a.bus_number, effectiveBusNumber))
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
  }, [user?.role, user?.bus_number, effectiveBusNumber]);

  // Derived metrics
  const totalFeedback = feedbackList.length;
  const positiveCount = feedbackList.filter(f => f.sentiment === 'positive').length;
  const negativeCount = feedbackList.filter(f => f.sentiment === 'negative').length;
  const satisfactionRate = totalFeedback > 0 ? Math.round((positiveCount / totalFeedback) * 100) : 85;
  const activeIssues = issuesList.filter(i => i.status !== 'resolved');
  const openActions = actionsList.filter(a => a.status !== 'completed' && a.status !== 'verified');

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/20 via-orange-600/10 to-transparent border border-amber-500/20 p-8 shadow-[0_0_50px_rgba(245,158,11,0.15)]">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <Bus size={14} />
                Bus Transport Intelligence
              </span>
              <span className="text-xs text-slate-400">Portal: Bus</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-amber-200 bg-clip-text text-transparent">
              {isStudent ? 'Student Bus Feedback' : isBusIncharge ? `Bus Incharge: ${userBusNumber}` : isTransportIncharge ? 'Transport Operations' : 'Transport Overview (Management)'}
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-xl">
              {isStudent
                ? 'Report bus punctuality, vehicle condition, safety, and view route notices.'
                : 'Monitor real-time feedback, bus maintenance alerts, route punctuality, and corrective actions.'}
            </p>
          </div>

          {/* Quick Context Card / Scope Selector */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {(isTransportIncharge || isManagement || isBusIncharge) && (
              <BusScopeSelector />
            )}
            <div className="flex items-center gap-4 bg-black/40 backdrop-blur-md px-5 py-3.5 rounded-2xl border border-white/10">
              <div className="h-11 w-11 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Bus size={22} />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">{contextLabel}</p>
                <p className="text-base font-bold text-white tracking-wide">{userBusNumber}</p>
                {boardingPoint && (
                  <p className="text-xs text-amber-400/90 flex items-center gap-1 mt-0.5">
                    <MapPin size={11} /> {boardingPoint}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl relative overflow-hidden group hover:border-amber-500/40 transition-all duration-300">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Feedback</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <MessageSquare size={18} />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white">
            <AnimatedCounter value={totalFeedback} />
          </div>
          <p className="text-xs text-slate-400 mt-2">Bus feedback entries</p>
        </div>

        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl relative overflow-hidden group hover:border-emerald-500/40 transition-all duration-300">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Satisfaction Rate</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-emerald-400">
            <AnimatedCounter value={satisfactionRate} />%
          </div>
          <p className="text-xs text-slate-400 mt-2">{positiveCount} positive ratings</p>
        </div>

        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl relative overflow-hidden group hover:border-red-500/40 transition-all duration-300">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Issues</span>
            <div className="p-2 rounded-xl bg-red-500/10 text-red-400">
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-red-400">
            <AnimatedCounter value={activeIssues.length} />
          </div>
          <p className="text-xs text-slate-400 mt-2">Requires incharge review</p>
        </div>

        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl relative overflow-hidden group hover:border-blue-500/40 transition-all duration-300">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Corrective Actions</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <CheckCircle size={18} />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-blue-400">
            <AnimatedCounter value={openActions.length} />
          </div>
          <p className="text-xs text-slate-400 mt-2">Scheduled / in progress</p>
        </div>
      </div>

      {/* Main Grid: Actions & Recent Feedback */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Feedback & Issues */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Action Banner for Students */}
          {isStudent && (
            <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border border-amber-500/30 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-white">Have feedback about your bus journey?</h3>
                <p className="text-xs text-slate-400 mt-1">Submit your rating on driver safety, seat availability, timing, or cleanliness.</p>
              </div>
              <Button
                variant="primary"
                onClick={() => navigate('/bus/feedback')}
                className="whitespace-nowrap flex items-center gap-2"
              >
                <MessageSquare size={16} />
                Give Feedback
              </Button>
            </div>
          )}

          {/* Recent Bus Feedback List */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Recent Bus Feedback</h2>
                  <p className="text-xs text-slate-400">Operational comments from commuters</p>
                </div>
              </div>
              <Link to="/bus/feedback" className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium transition-colors">
                View all <ChevronRight size={14} />
              </Link>
            </div>

            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                <Loader2 size={28} className="animate-spin text-amber-400 mb-2" />
                <p className="text-xs">Loading bus feedback...</p>
              </div>
            ) : feedbackList.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Bus size={36} className="mx-auto mb-3 opacity-30 text-amber-400" />
                <p className="text-sm font-medium">No bus feedback recorded yet.</p>
                <p className="text-xs text-slate-500 mt-1">Commuter submissions will appear here automatically.</p>
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
                          {formatBusDisplay(fb.bus_number || userBusNumber)}
                        </Badge>
                        <span className="text-xs font-medium text-slate-300">{fb.category}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Image buttons: View Image (if image exists) OR Upload Image */}
                        {(fb.imageUrl || fb.image_url) ? (
                          <button
                            type="button"
                            onClick={() => setSelectedImageFeedback(fb)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-white border border-amber-500/40 hover:border-amber-400 transition-all shadow-sm active:scale-95 cursor-pointer"
                            title="View student uploaded image along with feedback"
                          >
                            <Eye size={12} />
                            <span>View Image</span>
                          </button>
                        ) : (isTransportIncharge || isManagement) ? (
                          <button
                            type="button"
                            onClick={() => handleTriggerUpload(fb)}
                            disabled={uploadingFeedbackId === fb.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/[0.06] hover:bg-white/10 text-slate-300 hover:text-white border border-white/15 hover:border-white/25 transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
                            title="Upload image evidence for this feedback"
                            id={`upload-image-btn-${fb.id}`}
                          >
                            {uploadingFeedbackId === fb.id ? <Loader2 size={12} className="animate-spin text-amber-400" /> : <Camera size={12} className="text-amber-400" />}
                            <span>Upload Image</span>
                          </button>
                        ) : null}

                        {/* Required Action Button: for Transport Incharge and Management */}
                        {(isTransportIncharge || isManagement) && (
                          <button
                            type="button"
                            onClick={() => setRequiredActionFeedback(fb)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-amber-500/25 to-amber-600/25 hover:from-amber-500/40 hover:to-amber-600/40 text-amber-300 hover:text-white border border-amber-500/40 hover:border-amber-400 transition-all shadow-sm active:scale-95 cursor-pointer"
                            title="Open Required Action workflow for this feedback"
                            id={`required-action-btn-${fb.id}`}
                          >
                            <CheckSquare size={13} className="text-amber-400" />
                            <span>Required Action</span>
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
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 hover:border-amber-500/40 text-xs text-amber-300 transition-all group/img cursor-pointer"
                        >
                          <Camera size={13} className="text-amber-400 group-hover/img:scale-110 transition-transform" />
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

        {/* Right 1 Col: Route Details & Alerts */}
        <div className="space-y-6">
          {/* Assigned Bus Info */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-6 backdrop-blur-xl">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Bus size={16} className="text-amber-400" />
              Bus Information
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-slate-400">Bus Number</span>
                <span className="font-semibold text-white">{userBusNumber}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-slate-400">Boarding Point</span>
                <span className="font-semibold text-white">{boardingPoint}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-slate-400">Operating Status</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active Transport
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-400">Portal Scope</span>
                <span className="text-xs font-mono text-amber-400">Transport Operations</span>
              </div>
            </div>
          </div>

          {/* Quick Navigation Links */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-6 backdrop-blur-xl">
            <h3 className="text-sm font-bold text-white mb-3">Bus Quick Access</h3>
            <div className="space-y-2">
              <Link
                to="/bus/feedback"
                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 text-sm text-slate-300 hover:text-white transition-all"
              >
                <span className="flex items-center gap-2.5">
                  <MessageSquare size={16} className="text-amber-400" />
                  {isStudent ? 'Give Bus Feedback' : 'All Bus Feedback'}
                </span>
                <ChevronRight size={14} className="text-slate-500" />
              </Link>
              <Link
                to="/bus/issues"
                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 text-sm text-slate-300 hover:text-white transition-all"
              >
                <span className="flex items-center gap-2.5">
                  <AlertTriangle size={16} className="text-red-400" />
                  Bus Issues ({activeIssues.length})
                </span>
                <ChevronRight size={14} className="text-slate-500" />
              </Link>
              {!isStudent && (
                <Link
                  to="/bus/actions"
                  className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 text-sm text-slate-300 hover:text-white transition-all"
                >
                  <span className="flex items-center gap-2.5">
                    <CheckCircle size={16} className="text-blue-400" />
                    Corrective Actions ({openActions.length})
                  </span>
                  <ChevronRight size={14} className="text-slate-500" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hidden file input for uploading photo evidence to feedback */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelected}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
      />

      {/* Required Action Modal */}
      {requiredActionFeedback && (
        <RequiredActionModal
          isOpen={Boolean(requiredActionFeedback)}
          onClose={() => setRequiredActionFeedback(null)}
          feedback={requiredActionFeedback}
          onActionCreated={(newAction) => {
            setActionsList(prev => [newAction, ...prev]);
            setFeedbackList(prev =>
              prev.map(f => f.id === requiredActionFeedback.id ? { ...f, status: 'action_planned' as any } : f)
            );
            setActionSuccessNotice(`Required Action created for Bus ${newAction.bus_number || 'All'}: "${newAction.action}"`);
            setTimeout(() => setActionSuccessNotice(null), 6000);
          }}
        />
      )}

      {/* Action Created Success Toast Notification */}
      {actionSuccessNotice && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-slate-900/95 border border-emerald-500/50 shadow-2xl backdrop-blur-xl flex items-center gap-3 animate-in slide-in-from-bottom-5 text-sm text-white max-w-md">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <ShieldCheck size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-xs uppercase tracking-wider text-emerald-400">Action Registered</p>
            <p className="text-xs text-slate-300 truncate mt-0.5">{actionSuccessNotice}</p>
          </div>
          <Link
            to="/bus/actions"
            className="ml-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 transition-colors flex items-center gap-1 shrink-0"
          >
            <span>Bus Actions</span>
            <ArrowRight size={12} />
          </Link>
        </div>
      )}

      {/* Lightbox Modal for viewing student feedback photo & details */}
      {selectedImageFeedback && (
        <ImageLightboxModal
          isOpen={Boolean(selectedImageFeedback)}
          imageUrl={selectedImageFeedback.imageUrl || selectedImageFeedback.image_url}
          title={`${formatBusDisplay(selectedImageFeedback.bus_number || userBusNumber)} · ${selectedImageFeedback.category}`}
          feedback={{
            id: selectedImageFeedback.id,
            comment: selectedImageFeedback.comment,
            sentiment: selectedImageFeedback.sentiment,
            status: selectedImageFeedback.status,
            category: selectedImageFeedback.category,
            scope: formatBusDisplay(selectedImageFeedback.bus_number || userBusNumber),
            date: selectedImageFeedback.date,
            anonymous: selectedImageFeedback.anonymous,
            portal: 'bus'
          }}
          onClose={() => setSelectedImageFeedback(null)}
        />
      )}
    </div>
  );
}
