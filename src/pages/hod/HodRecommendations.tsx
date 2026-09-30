import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, Badge, Button, EmptyState } from '@/components/common/UI';
import { Modal, Drawer } from '@/components/common/Modal';
import {
  fetchRecommendations,
  fetchRecommendationById,
  createRecommendation
} from '@/services/recommendationService';
import { fetchIssues } from '@/services/issueService';
import { useAuth } from '@/context/AuthContext';
import {
  FileText,
  Plus,
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
  History
} from 'lucide-react';
import type { Recommendation, Issue, RecommendationPriority } from '@/types';

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending: { label: 'Pending Review', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800', icon: Clock },
  approved: { label: 'Approved', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800', icon: XCircle },
  deferred: { label: 'Deferred', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800', icon: PauseCircle },
};

export function HodRecommendations() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRec, setSelectedRec] = useState<Recommendation | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Form states for creating recommendation
  const [formIssueId, setFormIssueId] = useState<string>('');
  const [formTitle, setFormTitle] = useState<string>('');
  const [formCategory, setFormCategory] = useState<string>('');
  const [formPriority, setFormPriority] = useState<RecommendationPriority>('medium');
  const [formCost, setFormCost] = useState<string>('');
  const [formJustification, setFormJustification] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [recsRes, issuesList] = await Promise.all([
        fetchRecommendations({ department: user?.department }),
        fetchIssues(user?.department)
      ]);
      setRecommendations(recsRes.recommendations);
      setIssues(issuesList);
    } catch (err) {
      console.error('[HodRecommendations] Failed to load:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.department]);

  // Handle URL query parameter ?createForIssue=ID
  useEffect(() => {
    const createForIssueId = searchParams.get('createForIssue');
    if (createForIssueId && issues.length > 0) {
      const matched = issues.find(i => String(i.id) === String(createForIssueId));
      if (matched) {
        setFormIssueId(String(matched.id));
        setFormTitle(`Institutional Action: ${matched.title}`);
        setFormCategory(matched.category);
        setFormPriority(
          matched.severity === 'critical' ? 'critical' :
          matched.severity === 'high' ? 'high' :
          matched.severity === 'low' ? 'low' : 'medium'
        );
        setShowCreateModal(true);
      }
      // clear query param
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, issues]);

  const handleIssueSelect = (issueId: string) => {
    setFormIssueId(issueId);
    const matched = issues.find(i => String(i.id) === String(issueId));
    if (matched) {
      setFormTitle(`Institutional Action: ${matched.title}`);
      setFormCategory(matched.category);
      setFormPriority(
        matched.severity === 'critical' ? 'critical' :
        matched.severity === 'high' ? 'high' :
        matched.severity === 'low' ? 'low' : 'medium'
      );
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formIssueId || !formTitle || !formJustification) {
      setFormError('Please fill out all required fields.');
      return;
    }
    if (formJustification.trim().length < 5) {
      setFormError('Justification must be at least 5 characters.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await createRecommendation({
        issueId: formIssueId,
        title: formTitle.trim(),
        justification: formJustification.trim(),
        category: formCategory || 'Infrastructure',
        priority: formPriority,
        estimatedCost: formCost ? parseFloat(formCost) : 0,
      });
      setShowCreateModal(false);
      resetForm();
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit recommendation.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormIssueId('');
    setFormTitle('');
    setFormCategory('');
    setFormPriority('medium');
    setFormCost('');
    setFormJustification('');
    setFormError(null);
  };

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

  // Filtered list
  const filteredRecs = recommendations.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && r.priority !== priorityFilter) return false;
    return true;
  });

  const stats = {
    total: recommendations.length,
    pending: recommendations.filter(r => r.status === 'pending').length,
    approved: recommendations.filter(r => r.status === 'approved').length,
    rejected: recommendations.filter(r => r.status === 'rejected').length,
    deferred: recommendations.filter(r => r.status === 'deferred').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              Department Recommendations
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              HOD Portal
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
              <Building size={13} />
              {user?.department || 'Department'}
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Formal recommendations escalated to Executive Management for institutional action
            </span>
          </div>
        </div>

        <Button
          variant="primary"
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2"
        >
          <Plus size={16} />
          Recommend to Management
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card
          className="p-4 cursor-pointer"
          hover
          onClick={() => setStatusFilter('all')}
        >
          <div className="flex items-center gap-2 mb-1">
            <FileText size={16} className="text-blue-500" />
            <span className="text-xs text-slate-400">Total Escalations</span>
          </div>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.total}</p>
        </Card>

        <Card
          className="p-4 cursor-pointer"
          hover
          onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
        >
          <div className="flex items-center gap-2 mb-1">
            <Clock size={16} className="text-amber-500" />
            <span className="text-xs text-slate-400">Pending Review</span>
          </div>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.pending}</p>
        </Card>

        <Card
          className="p-4 cursor-pointer"
          hover
          onClick={() => setStatusFilter(statusFilter === 'approved' ? 'all' : 'approved')}
        >
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 size={16} className="text-emerald-500" />
            <span className="text-xs text-slate-400">Approved by Mgmt</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.approved}</p>
        </Card>

        <Card
          className="p-4 cursor-pointer"
          hover
          onClick={() => setStatusFilter(statusFilter === 'deferred' ? 'all' : 'deferred')}
        >
          <div className="flex items-center gap-2 mb-1">
            <PauseCircle size={16} className="text-purple-500" />
            <span className="text-xs text-slate-400">Deferred / Rejected</span>
          </div>
          <p className="text-2xl font-bold text-slate-600 dark:text-slate-400">
            {stats.deferred + stats.rejected}
          </p>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {(['all', 'pending', 'approved', 'rejected', 'deferred'] as const).map(st => {
            const isActive = statusFilter === st;
            const label = st === 'all' ? 'All Statuses' : statusConfig[st]?.label || st;
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
              >
                {label}
              </button>
            );
          })}
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

      {/* Recommendations List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <Loader2 size={28} className="animate-spin mx-auto mb-2 text-blue-500" />
          <p className="text-sm">Loading department recommendations...</p>
        </div>
      ) : filteredRecs.length === 0 ? (
        <EmptyState
          icon={<FileText size={48} />}
          title="No recommendations found"
          message={
            statusFilter === 'all'
              ? 'No institutional recommendations have been submitted for your department yet.'
              : `No recommendations with status "${statusFilter}".`
          }
          actionLabel="Recommend to Management"
          onAction={() => {
            resetForm();
            setShowCreateModal(true);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredRecs.map(rec => {
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

                    {rec.action_id && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                        <ShieldCheck size={12} />
                        Action #{rec.action_id}
                      </span>
                    )}
                  </div>

                  <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1 leading-snug">
                    {rec.title}
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                    {rec.justification}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle size={13} className="text-amber-500" />
                      Issue #{rec.issue_id} {rec.issue_title ? `· ${rec.issue_title}` : ''}
                    </span>
                    {Number(rec.estimated_cost) > 0 && (
                      <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-0.5">
                        <DollarSign size={13} className="text-emerald-500" />
                        Est. ₹{Number(rec.estimated_cost).toLocaleString()}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Submitted: {new Date(rec.created_at).toLocaleDateString()}</span>
                    {rec.reviewed_by_name && (
                      <span className="font-medium text-slate-600 dark:text-slate-300">
                        Reviewed by {rec.reviewed_by_name}
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail Drawer */}
      <Drawer
        open={!!selectedRec}
        onClose={() => setSelectedRec(null)}
        title="Recommendation Details"
      >
        {selectedRec && (
          <div className="space-y-5">
            {/* Top Badges */}
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

            {/* Title & Justification */}
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

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <p className="text-slate-400 mb-1">Department</p>
                <p className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                  <Building size={14} />
                  {selectedRec.department}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <p className="text-slate-400 mb-1">Estimated Budget</p>
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

            {/* Management Review Card */}
            {selectedRec.reviewed_at ? (
              <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/50 dark:bg-blue-900/10 space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-blue-500" />
                  <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                    Executive Management Review
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Reviewed by <span className="font-semibold">{selectedRec.reviewed_by_name}</span> on{' '}
                  {new Date(selectedRec.reviewed_at).toLocaleDateString()}
                </p>
                {selectedRec.review_notes && (
                  <div className="mt-2 text-xs p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
                    <span className="font-medium text-slate-500 dark:text-slate-400 block mb-1">
                      Reviewer Notes:
                    </span>
                    {selectedRec.review_notes}
                  </div>
                )}
                {selectedRec.action_id && (
                  <div className="mt-2 flex items-center justify-between text-xs font-medium text-emerald-700 dark:text-emerald-300 pt-1">
                    <span>Corrective Action Created: #{selectedRec.action_id}</span>
                    <button
                      onClick={() => navigate(`/hod/actions`)}
                      className="text-blue-600 hover:underline flex items-center gap-1"
                    >
                      View in Actions <ArrowRight size={12} />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 text-xs text-amber-800 dark:text-amber-300">
                <div className="flex items-center gap-1.5 font-semibold mb-1">
                  <Clock size={14} />
                  Awaiting Executive Management Review
                </div>
                This recommendation is queued for executive leadership review. Once reviewed, decision notes and action conversions will appear here.
              </div>
            )}

            {/* Audit Trail Updates */}
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

      {/* Create Recommendation Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => {
          if (!submitting) setShowCreateModal(false);
        }}
        title="Escalate Issue to Executive Management"
        size="lg"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Related Department Issue *
            </label>
            <select
              value={formIssueId}
              onChange={e => handleIssueSelect(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              required
            >
              <option value="">Select an issue from your department...</option>
              {issues.map(iss => (
                <option key={iss.id} value={iss.id}>
                  #{iss.id} — {iss.title} ({iss.category} · {iss.severity})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Recommendation Title *
            </label>
            <input
              type="text"
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              placeholder="e.g., Procure 40 High-Performance Workstations for AI Lab"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Category
              </label>
              <input
                type="text"
                value={formCategory}
                onChange={e => setFormCategory(e.target.value)}
                placeholder="e.g., Laboratory, Infrastructure"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Priority
              </label>
              <select
                value={formPriority}
                onChange={e => setFormPriority(e.target.value as RecommendationPriority)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Estimated Cost (₹)
              </label>
              <input
                type="number"
                value={formCost}
                onChange={e => setFormCost(e.target.value)}
                placeholder="Optional budget"
                min="0"
                step="500"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Justification & Required Management Support *
            </label>
            <textarea
              value={formJustification}
              onChange={e => setFormJustification(e.target.value)}
              placeholder="Explain why this requires institutional-level action from Management rather than departmental resolution (e.g. budgetary approval, campus infrastructure vendor contracts, central procurement)..."
              rows={4}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowCreateModal(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" /> Submitting...
                </span>
              ) : (
                'Submit Recommendation'
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
