import { useState, useEffect } from 'react';
import { Card, Badge, Button, EmptyState } from '@/components/common/UI';
import { Drawer } from '@/components/common/Modal';
import {
  fetchStudentForms,
  fetchFormById,
  fetchSubmissionStatus,
  type FeedbackForm,
  type SubmissionStatus
} from '@/services/formService';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ImageLightboxModal } from '@/components/common/ImageUpload';
import { getFullImageUrl } from '@/services/uploadService';
import {
  FileText,
  Filter,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ChevronRight,
  Loader2,
  Calendar,
  Building,
  Check,
  Star,
  MessageSquare,
  ArrowRight,
  Camera,
  Maximize2
} from 'lucide-react';

export function StudentHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [forms, setForms] = useState<FeedbackForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state: 'all' | 'submitted' | 'pending'
  const [filter, setFilter] = useState<'all' | 'submitted' | 'pending'>('all');

  // Selected form for detail drawer
  const [selectedForm, setSelectedForm] = useState<FeedbackForm | null>(null);
  const [submissionDetail, setSubmissionDetail] = useState<SubmissionStatus | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const studentForms = await fetchStudentForms();
        if (mounted) {
          setForms(studentForms);
        }
      } catch (err: any) {
        console.warn('[StudentHistory] fetchStudentForms error:', err);
        if (mounted) {
          setError(err.message || 'Failed to fetch department survey history.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, [user]);

  const handleOpenDetail = async (form: FeedbackForm) => {
    setSelectedForm(form);
    setSubmissionDetail(null);

    if (form.has_submitted) {
      try {
        setLoadingDetail(true);
        const statusData = await fetchSubmissionStatus(form.id);
        setSubmissionDetail(statusData);
      } catch (err) {
        console.error('[StudentHistory] Error fetching submission status:', err);
      } finally {
        setLoadingDetail(false);
      }
    }
  };

  const filteredForms = forms.filter(f => {
    if (filter === 'submitted') return f.has_submitted;
    if (filter === 'pending') return !f.has_submitted;
    return true;
  });

  const submittedCount = forms.filter(f => f.has_submitted).length;
  const pendingCount = forms.filter(f => !f.has_submitted).length;

  const filters: { value: 'all' | 'submitted' | 'pending'; label: string; count: number }[] = [
    { value: 'all', label: 'All Surveys', count: forms.length },
    { value: 'submitted', label: 'Submitted', count: submittedCount },
    { value: 'pending', label: 'Pending Feedback', count: pendingCount },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
              <FileText className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              My Survey Feedback History
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Track official Head of Department surveys and review your submitted feedback responses {user?.department ? `· ${user.department}` : ''}.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <Badge variant="default" className="text-xs">
            {user?.department}
          </Badge>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-0.5">
                Total Targeted
              </p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {forms.length}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <FileText size={20} />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/20 dark:bg-emerald-950/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-0.5">
                Responses Submitted
              </p>
              <h3 className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                {submittedCount}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={20} />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-amber-100 dark:border-amber-900/30 bg-amber-50/20 dark:bg-amber-950/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-0.5">
                Pending Response
              </p>
              <h3 className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                {pendingCount}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
              <Clock size={20} />
            </div>
          </div>
        </Card>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-sm flex items-center gap-2">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Filter size={16} className="text-slate-400 flex-shrink-0 mr-1" />
        {filters.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 backdrop-blur-md ${
              filter === f.value
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                : 'bg-white/60 dark:bg-white/[0.04] text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-white/10 hover:border-cyan-400/30'
            }`}
          >
            <span>{f.label}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              filter === f.value ? 'bg-cyan-500 text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-400 dark:text-slate-300'
            }`}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Loader2 size={32} className="animate-spin mb-3 text-blue-500" />
          <p className="text-sm font-medium">Loading survey feedback history...</p>
        </div>
      ) : filteredForms.length === 0 ? (
        <EmptyState
          icon={<FileText size={48} />}
          title={forms.length === 0 ? "No Department Surveys Published" : "No Surveys Match Filter"}
          message={
            forms.length === 0
              ? "Your Head of Department has not published any feedback surveys for your department yet."
              : "Try switching filters to view your submitted or pending department surveys."
          }
          actionLabel={filter !== 'all' ? "Show All Surveys" : undefined}
          onAction={filter !== 'all' ? () => setFilter('all') : undefined}
        />
      ) : (
        <div className="space-y-3">
          {filteredForms.map((form) => {
            const isSubmitted = form.has_submitted;
            const submittedDate = form.my_submitted_at
              ? new Date(form.my_submitted_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : null;

            return (
              <Card
                key={form.id}
                className="p-5 transition-all hover:border-blue-300 dark:hover:border-blue-700"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isSubmitted ? (
                        <Badge variant="positive" className="text-xs">
                          <CheckCircle2 size={12} className="mr-1 inline" /> Submitted
                        </Badge>
                      ) : (
                        <Badge variant="warning" className="text-xs">
                          <Clock size={12} className="mr-1 inline" /> Pending Response
                        </Badge>
                      )}

                      {form.target_academic_year && (
                        <Badge variant="low" className="text-xs">
                          Target: {form.target_academic_year}
                        </Badge>
                      )}

                      <span className="text-xs text-slate-400">
                        {form.question_count || 0} Questions
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {form.title}
                    </h3>

                    {form.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        {form.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                      <span className="flex items-center gap-1">
                        <Building size={13} /> {form.department}
                      </span>
                      {submittedDate && (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                          <Check size={13} /> Submitted on {submittedDate}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex items-center gap-2 flex-shrink-0 self-start sm:self-center">
                    {isSubmitted ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDetail(form)}
                        className="text-xs flex items-center gap-1.5"
                      >
                        <FileText size={14} /> View Submission Details
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => navigate(`/student/feedback?formId=${form.id}`)}
                        className="text-xs flex items-center gap-1.5 shadow-sm"
                      >
                        Complete Survey <ArrowRight size={14} />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Submission Details Drawer */}
      <Drawer
        open={!!selectedForm}
        onClose={() => setSelectedForm(null)}
        title="Survey Submission Details"
      >
        {selectedForm && (
          <div className="space-y-5">
            {/* Header Details */}
            <div className="p-4 rounded-xl bg-white/70 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 space-y-2 backdrop-blur-md">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Badge variant={selectedForm.has_submitted ? 'positive' : 'warning'}>
                  {selectedForm.has_submitted ? 'Submitted' : 'Pending Response'}
                </Badge>
                <div className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                  <ShieldCheck size={14} />
                  <span>Anonymous Response</span>
                </div>
              </div>

              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {selectedForm.title}
              </h2>

              {selectedForm.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedForm.description}
                </p>
              )}

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200/80 dark:border-white/10">
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Department:</span> {selectedForm.department}
                </div>
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Target Cohort:</span> {selectedForm.target_academic_year || 'All Years'}
                </div>
                {submissionDetail?.submittedAt && (
                  <div className="col-span-2 text-emerald-400">
                    <span className="font-semibold">Submitted At:</span>{' '}
                    {new Date(submissionDetail.submittedAt).toLocaleString()}
                  </div>
                )}
              </div>
            </div>

            {/* Questions & Recorded Answers */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                <span>Submitted Responses</span>
                {submissionDetail?.answers && (
                  <Badge variant="default" className="text-[10px]">
                    {submissionDetail.answers.length} Answers
                  </Badge>
                )}
              </h3>

              {loadingDetail && (
                <div className="py-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                  <Loader2 size={24} className="animate-spin text-blue-500" />
                  <p className="text-xs">Loading your submitted responses...</p>
                </div>
              )}

              {!loadingDetail && submissionDetail?.answers && submissionDetail.answers.length > 0 ? (
                <div className="space-y-3">
                  {submissionDetail.answers.map((ans, idx) => (
                    <div
                      key={ans.question_id || idx}
                      className="p-3.5 rounded-xl bg-white/70 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 space-y-2 backdrop-blur-md"
                    >
                      <div className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-md bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                          {idx + 1}
                        </span>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {ans.question_text || `Question ${idx + 1}`}
                        </p>
                      </div>

                      {/* Answer value display */}
                      <div className="pl-7">
                        {ans.question_type === 'rating' && ans.rating_value && (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center text-amber-500">
                              {[1, 2, 3, 4, 5].map(star => (
                                <Star
                                  key={star}
                                  size={14}
                                  className={star <= (ans.rating_value || 0) ? 'fill-amber-500' : 'text-slate-300 dark:text-slate-600'}
                                />
                              ))}
                            </div>
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              {ans.rating_value} / 5
                            </span>
                          </div>
                        )}

                        {ans.question_type === 'mcq' && ans.selected_option && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-300 bg-cyan-500/15 px-2.5 py-1 rounded-lg border border-cyan-500/30">
                            <Check size={13} /> {ans.selected_option}
                          </span>
                        )}

                        {ans.question_type === 'yes_no' && ans.selected_option && (
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${
                            ans.selected_option === 'Yes'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}>
                            {ans.selected_option}
                          </span>
                        )}

                        {ans.question_type === 'text' && (
                          <div className="p-2.5 rounded-lg bg-white/60 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300">
                            {ans.text_response || 'No written response provided.'}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                !loadingDetail && (
                  <p className="text-xs text-slate-400 py-4 text-center">
                    Submission recorded. Detailed question breakdown unavailable.
                  </p>
                )
              )}
            </div>

            {/* Attached Photo / Evidence if present */}
            {submissionDetail?.imageUrl && (
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Camera size={15} className="text-cyan-400" />
                  <span>Attached Photo / Evidence</span>
                </h3>
                <div
                  onClick={() => setActiveLightboxImage(getFullImageUrl(submissionDetail.imageUrl!))}
                  className="group relative cursor-pointer overflow-hidden rounded-xl border border-slate-200 dark:border-white/15 bg-black/40 aspect-video max-h-56 transition-all hover:border-cyan-400/50 shadow-md"
                  title="Click to view full photo"
                >
                  <img
                    src={getFullImageUrl(submissionDetail.imageUrl)}
                    alt="Submission attachment"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 group-hover:opacity-100 transition-opacity flex items-end p-3">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300 bg-black/70 backdrop-blur-md px-3 py-1 rounded-lg border border-cyan-500/30">
                      <Camera size={13} />
                      <span>View Full Image</span>
                      <Maximize2 size={12} className="ml-0.5 opacity-70" />
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <Button variant="ghost" size="sm" onClick={() => setSelectedForm(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Drawer>

      {/* Lightbox Modal */}
      {Boolean(activeLightboxImage) && (
        <ImageLightboxModal
          isOpen={Boolean(activeLightboxImage)}
          imageUrl={activeLightboxImage}
          title={selectedForm?.title ? `${selectedForm.title} · Survey Attachment` : 'Survey Evidence Attachment'}
          onClose={() => setActiveLightboxImage(null)}
        />
      )}
    </div>
  );
}
