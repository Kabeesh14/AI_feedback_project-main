import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Badge, Button, EmptyState } from '@/components/common/UI';
import { Modal, Drawer } from '@/components/common/Modal';
import {
  fetchRecommendations,
  fetchRecommendationById,
  reviewRecommendation,
  convertRecommendationToAction
} from '@/services/recommendationService';
import { OFFICIAL_DEPARTMENTS, type Recommendation, type RecommendationPriority } from '@/types';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  PauseCircle,
  AlertTriangle,
  Building,
  DollarSign,
  User,
  Calendar,
  ArrowRight,
  Loader2,
  ShieldCheck,
  CheckSquare,
  History,
  Filter,
  Check,
  Layers
} from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending: { label: 'Pending Review', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800', icon: Clock },
  approved: { label: 'Approved', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800', icon: XCircle },
  deferred: { label: 'Deferred', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800', icon: PauseCircle },
};

export function ManagementRecommendations() {
  const navigate = useNavigate();

  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const [selectedRec, setSelectedRec] = useState<Recommendation | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Review Modal State
  const [reviewModalRec, setReviewModalRec] = useState<Recommendation | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'approved' | 'rejected' | 'deferred'>('approved');
  const [reviewNotes, setReviewNotes] = useState('');
  const [createActionImmediately, setCreateActionImmediately] = useState(false);
  const [assignedTo, setAssignedTo] = useState('');
  const [targetCompletionDate, setTargetCompletionDate] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Conversion Modal State (for approved recommendations)
  const [convertModalRec, setConvertModalRec] = useState<Recommendation | null>(null);
  const [convertAssignedTo, setConvertAssignedTo] = useState('');
  const [convertTargetDate, setConvertTargetDate] = useState('');
  const [convertPriority, setConvertPriority] = useState<RecommendationPriority>('high');
  const [convertCost, setConvertCost] = useState('');
  const [convertSubmitting, setConvertSubmitting] = useState(false);
  const [convertError, setConvertError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchRecommendations({
        department: departmentFilter !== 'all' ? departmentFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined,
      });
      setRecommendations(res.recommendations);
    } catch (err) {
      console.error('[ManagementRecommendations] Failed to load:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [departmentFilter, statusFilter, priorityFilter]);

  const handleOpenDetail = async (rec: Recommendation) => {
    setSelectedRec(rec);
    setLoadingDetail(true);
    try {
      const detailed = await fetchRecommendationById(rec.id);
      setSelectedRec(detailed);
    } catch (err) {
      console.warn('Failed to load detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleOpenReviewModal = (rec: Recommendation, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setReviewModalRec(rec);
    setReviewDecision('approved');
    setReviewNotes('');
    setCreateActionImmediately(false);
    setAssignedTo('Central IT & Facilities Team');
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 30);
    setTargetCompletionDate(defaultDate.toISOString().split('T')[0]);
    setReviewError(null);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModalRec) return;

    if (reviewDecision === 'approved' && createActionImmediately && (!assignedTo || !targetCompletionDate)) {
      setReviewError('Please specify assignee and target completion date to create action.');
      return;
    }

    setReviewSubmitting(true);
    setReviewError(null);
    try {
      await reviewRecommendation(reviewModalRec.id, {
        decision: reviewDecision,
        reviewNotes: reviewNotes.trim() || undefined,
        assignedTo: createActionImmediately ? assignedTo.trim() : undefined,
        targetCompletionDate: createActionImmediately ? targetCompletionDate : undefined,
        createAction: createActionImmediately,
      });
      setReviewModalRec(null);
      if (selectedRec?.id === reviewModalRec.id) {
        setSelectedRec(null);
      }
      await loadData();
    } catch (err: any) {
      setReviewError(err.message || 'Failed to submit review.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleOpenConvertModal = (rec: Recommendation, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setConvertModalRec(rec);
    setConvertAssignedTo('Campus Administration & Infrastructure');
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 30);
    setConvertTargetDate(defaultDate.toISOString().split('T')[0]);
    setConvertPriority(rec.priority || 'high');
    setConvertCost(rec.estimated_cost ? String(rec.estimated_cost) : '');
    setConvertError(null);
  };

  const handleConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertModalRec) return;
    if (!convertAssignedTo || !convertTargetDate) {
      setConvertError('Please specify assignee and target completion date.');
      return;
    }

    setConvertSubmitting(true);
    setConvertError(null);
    try {
      await convertRecommendationToAction(convertModalRec.id, {
        assignedTo: convertAssignedTo.trim(),
        targetCompletionDate: convertTargetDate,
        priority: convertPriority,
        estimatedCost: convertCost ? parseFloat(convertCost) : undefined,
      });
      setConvertModalRec(null);
      if (selectedRec?.id === convertModalRec.id) {
        setSelectedRec(null);
      }
      await loadData();
    } catch (err: any) {
      setConvertError(err.message || 'Failed to convert to action.');
    } finally {
      setConvertSubmitting(false);
    }
  };

  const stats = {
    total: recommendations.length,
    pending: recommendations.filter(r => r.status === 'pending').length,
    approved: recommendations.filter(r => r.status === 'approved').length,
    actionsCreated: recommendations.filter(r => r.action_id !== null).length,
    deferred: recommendations.filter(r => r.status === 'deferred').length,
    rejected: recommendations.filter(r => r.status === 'rejected').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              Institutional Recommendations Review
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300 border border-violet-300 dark:border-violet-800">
              Executive Management
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Review departmental escalations from HODs, provide executive decisions, and convert approved items to institutional corrective actions.
          </p>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card
          className="p-4 cursor-pointer"
          hover
          onClick={() => setStatusFilter('all')}
        >
          <div className="flex items-center gap-2 mb-1">
            <Layers size={16} className="text-slate-400" />
            <span className="text-xs text-slate-400">Total Escalations</span>
          </div>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.total}</p>
        </Card>

        <Card
          className="p-4 cursor-pointer"
          hover
          onClick={() => setStatusFilter('pending')}
        >
          <div className="flex items-center gap-2 mb-1">
            <Clock size={16} className="text-amber-500" />
            <span className="text-xs text-slate-400">Under Review</span>
          </div>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.pending}</p>
        </Card>

        <Card
          className="p-4 cursor-pointer"
          hover
          onClick={() => setStatusFilter('approved')}
        >
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 size={16} className="text-emerald-500" />
            <span className="text-xs text-slate-400">Approved by Leadership</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.approved}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck size={16} className="text-blue-500" />
            <span className="text-xs text-slate-400">Actions Created</span>
          </div>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.actionsCreated}</p>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        {/* Status Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {(['all', 'pending', 'approved', 'rejected', 'deferred'] as const).map(st => {
            const isActive = statusFilter === st;
            const label = st === 'all' ? 'All Statuses' : statusConfig[st]?.label || st;
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Dropdown Filters */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Department:</span>
            <select
              value={departmentFilter}
              onChange={e => setDepartmentFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">All Departments</option>
              {OFFICIAL_DEPARTMENTS.map(d => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Priority:</span>
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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

      {/* Recommendations Cards */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <Loader2 size={28} className="animate-spin mx-auto mb-2 text-blue-500" />
          <p className="text-sm">Loading recommendations for review...</p>
        </div>
      ) : recommendations.length === 0 ? (
        <EmptyState
          icon={<FileText size={48} />}
          title="No recommendations match filters"
          message="No HOD escalations match your selected department or status filters."
          actionLabel="Reset Filters"
          onAction={() => {
            setStatusFilter('all');
            setDepartmentFilter('all');
            setPriorityFilter('all');
          }}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {recommendations.map(rec => {
            const st = statusConfig[rec.status] || statusConfig.pending;
            const StatusIcon = st.icon;

            return (
              <Card
                key={rec.id}
                className="p-5 flex flex-col justify-between"
                hover
                onClick={() => handleOpenDetail(rec)}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {rec.recommendation_code}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${st.bg} ${st.color}`}
                      >
                        <StatusIcon size={12} />
                        {st.label}
                      </span>
                      <Badge
                        variant={
                          rec.priority === 'critical' ? 'critical' :
                            rec.priority === 'high' ? 'high' :
                              rec.priority === 'low' ? 'low' : 'medium'
                        }
                      >
                        {rec.priority.toUpperCase()}
                      </Badge>
                    </div>

                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                      <Building size={12} />
                      {rec.department}
                    </span>
                  </div>

                  <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1 leading-snug">
                    {rec.title}
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                    {rec.justification}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <User size={13} />
                      HOD: {rec.created_by_name}
                    </span>
                    {Number(rec.estimated_cost) > 0 && (
                      <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-0.5">
                        <DollarSign size={13} className="text-emerald-500" />
                        Est. ₹{Number(rec.estimated_cost).toLocaleString()}
                      </span>
                    )}
                  </div>

                  {/* Actions / Buttons */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400">
                      {new Date(rec.created_at).toLocaleDateString()}
                    </span>

                    <div className="flex items-center gap-2">
                      {rec.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={(e) => handleOpenReviewModal(rec, e)}
                          className="flex items-center gap-1.5 text-xs py-1"
                        >
                          <CheckCircle2 size={13} />
                          Review
                        </Button>
                      )}

                      {rec.status === 'approved' && !rec.action_id && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => handleOpenConvertModal(rec, e)}
                          className="flex items-center gap-1.5 text-xs py-1 text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-900/20"
                        >
                          <ShieldCheck size={13} />
                          Create Action
                        </Button>
                      )}

                      {rec.action_id && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          <CheckSquare size={13} />
                          Action #{rec.action_id}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Review Modal */}
      <Modal
        open={!!reviewModalRec}
        onClose={() => {
          if (!reviewSubmitting) setReviewModalRec(null);
        }}
        title="Executive Management Review"
        size="lg"
      >
        {reviewModalRec && (
          <form onSubmit={handleReviewSubmit} className="space-y-4">
            {reviewError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
                {reviewError}
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-semibold text-slate-600 dark:text-slate-300">
                  {reviewModalRec.recommendation_code}
                </span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {reviewModalRec.department}
                </span>
              </div>
              <p className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                {reviewModalRec.title}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3">
                {reviewModalRec.justification}
              </p>
              {Number(reviewModalRec.estimated_cost) > 0 && (
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 pt-1">
                  Budget Requested: ₹{Number(reviewModalRec.estimated_cost).toLocaleString()}
                </p>
              )}
            </div>

            {/* Decision Radio / Buttons */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Executive Decision *
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setReviewDecision('approved')}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-all ${reviewDecision === 'approved'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-500 shadow-sm dark:bg-emerald-900/30 dark:text-emerald-300'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                >
                  <CheckCircle2 size={16} />
                  Approve
                </button>

                <button
                  type="button"
                  onClick={() => setReviewDecision('deferred')}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-all ${reviewDecision === 'deferred'
                      ? 'bg-purple-50 text-purple-700 border-purple-500 shadow-sm dark:bg-purple-900/30 dark:text-purple-300'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                >
                  <PauseCircle size={16} />
                  Defer
                </button>

                <button
                  type="button"
                  onClick={() => setReviewDecision('rejected')}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-all ${reviewDecision === 'rejected'
                      ? 'bg-rose-50 text-rose-700 border-rose-500 shadow-sm dark:bg-rose-900/30 dark:text-rose-300'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                >
                  <XCircle size={16} />
                  Reject
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Executive Review Notes & Rationale
              </label>
              <textarea
                value={reviewNotes}
                onChange={e => setReviewNotes(e.target.value)}
                placeholder="Provide notes, rationale, conditions, or budget guidance..."
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
              />
            </div>

            {/* Immediate Action Conversion Options if Approved */}
            {reviewDecision === 'approved' && (
              <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/50 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createActionImmediately}
                    onChange={e => setCreateActionImmediately(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                    Create institutional corrective action immediately
                  </span>
                </label>

                {createActionImmediately && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Assigned To / Department
                      </label>
                      <input
                        type="text"
                        value={assignedTo}
                        onChange={e => setAssignedTo(e.target.value)}
                        placeholder="e.g., Central IT Services"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Target Completion Date
                      </label>
                      <input
                        type="date"
                        value={targetCompletionDate}
                        onChange={e => setTargetCompletionDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        required
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setReviewModalRec(null)}
                disabled={reviewSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={reviewSubmitting}>
                {reviewSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" /> Submitting Review...
                  </span>
                ) : (
                  'Submit Decision'
                )}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Convert to Action Modal */}
      <Modal
        open={!!convertModalRec}
        onClose={() => {
          if (!convertSubmitting) setConvertModalRec(null);
        }}
        title="Convert Approved Recommendation to Action"
        size="md"
      >
        {convertModalRec && (
          <form onSubmit={handleConvertSubmit} className="space-y-4">
            {convertError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
                {convertError}
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
              <p className="text-xs text-slate-400">Recommendation</p>
              <p className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                {convertModalRec.title}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Department: {convertModalRec.department} · {convertModalRec.recommendation_code}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Assigned Team / Organization *
              </label>
              <input
                type="text"
                value={convertAssignedTo}
                onChange={e => setConvertAssignedTo(e.target.value)}
                placeholder="e.g., Central Procurement, Estate Maintenance"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Target Deadline *
                </label>
                <input
                  type="date"
                  value={convertTargetDate}
                  onChange={e => setConvertTargetDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Action Priority
                </label>
                <select
                  value={convertPriority}
                  onChange={e => setConvertPriority(e.target.value as RecommendationPriority)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Approved Budget / Cost (₹)
              </label>
              <input
                type="number"
                value={convertCost}
                onChange={e => setConvertCost(e.target.value)}
                placeholder="Approved expenditure"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setConvertModalRec(null)}
                disabled={convertSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={convertSubmitting}>
                {convertSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" /> Creating Action...
                  </span>
                ) : (
                  'Create Institutional Action'
                )}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Detail Drawer */}
      <Drawer
        open={!!selectedRec}
        onClose={() => setSelectedRec(null)}
        title="Recommendation Details"
      >
        {selectedRec && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {selectedRec.recommendation_code}
              </span>
              {(() => {
                const st = statusConfig[selectedRec.status] || statusConfig.pending;
                const StatusIcon = st.icon;
                return (
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${st.bg} ${st.color}`}
                  >
                    <StatusIcon size={12} />
                    {st.label}
                  </span>
                );
              })()}
              <Badge
                variant={
                  selectedRec.priority === 'critical' ? 'critical' :
                    selectedRec.priority === 'high' ? 'high' :
                      selectedRec.priority === 'low' ? 'low' : 'medium'
                }
              >
                {selectedRec.priority.toUpperCase()}
              </Badge>
              <Badge variant="default">{selectedRec.category}</Badge>
            </div>

            <div>
              <p className="text-xs text-slate-400 mb-1">Title</p>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {selectedRec.title}
              </h2>
            </div>

            <div>
              <p className="text-xs text-slate-400 mb-1">HOD Justification & Executive Summary</p>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                {selectedRec.justification}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <p className="text-slate-400 mb-1">Department</p>
                <p className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                  <Building size={14} />
                  {selectedRec.department}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <p className="text-slate-400 mb-1">Estimated Cost</p>
                <p className="font-semibold text-slate-700 dark:text-slate-200">
                  {Number(selectedRec.estimated_cost) > 0
                    ? `₹${Number(selectedRec.estimated_cost).toLocaleString()}`
                    : 'Not specified'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <p className="text-slate-400 mb-1">Submitted By</p>
                <p className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                  <User size={14} />
                  {selectedRec.created_by_name}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <p className="text-slate-400 mb-1">Submitted At</p>
                <p className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                  <Calendar size={14} />
                  {new Date(selectedRec.created_at).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Quick Actions in Drawer */}
            <div className="flex items-center gap-3 pt-2">
              {selectedRec.status === 'pending' && (
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={() => handleOpenReviewModal(selectedRec)}
                >
                  <CheckCircle2 size={16} />
                  Perform Executive Review
                </Button>
              )}

              {selectedRec.status === 'approved' && !selectedRec.action_id && (
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={() => handleOpenConvertModal(selectedRec)}
                >
                  <ShieldCheck size={16} />
                  Convert to Action
                </Button>
              )}

              {selectedRec.action_id && (
                <div className="flex-1 py-2 px-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-xs font-semibold text-blue-700 dark:text-blue-300 flex items-center justify-center gap-2 border border-blue-200 dark:border-blue-800">
                  <CheckSquare size={16} />
                  Corrective Action #{selectedRec.action_id}
                </div>
              )}
            </div>

            {/* Review Info */}
            {selectedRec.reviewed_at && (
              <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/50 dark:bg-blue-900/10 space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-blue-500" />
                  <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                    Executive Review Record
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Decision: <span className="font-semibold capitalize">{selectedRec.status}</span> by{' '}
                  <span className="font-semibold">{selectedRec.reviewed_by_name}</span> on{' '}
                  {new Date(selectedRec.reviewed_at).toLocaleDateString()}
                </p>
                {selectedRec.review_notes && (
                  <div className="mt-2 text-xs p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
                    <span className="font-medium text-slate-500 dark:text-slate-400 block mb-1">
                      Notes:
                    </span>
                    {selectedRec.review_notes}
                  </div>
                )}
              </div>
            )}

            {/* Audit History */}
            {selectedRec.updates && selectedRec.updates.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2">
                  <History size={16} className="text-slate-400" />
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Audit Trail & History
                  </h4>
                </div>
                <div className="space-y-2 border-l-2 border-slate-200 dark:border-slate-700 pl-3 ml-2 text-xs">
                  {selectedRec.updates.map(up => (
                    <div key={up.id} className="relative py-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          {up.actor_name}
                        </span>
                        <span className="text-slate-400">
                          {new Date(up.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                        {up.update_text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
