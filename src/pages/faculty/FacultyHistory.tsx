import { useState, useEffect } from 'react';
import { Card, Badge, Button, EmptyState } from '@/components/common/UI';
import { Drawer } from '@/components/common/Modal';
import {
  fetchFacultyForms,
  fetchSubmissionStatus,
  type FeedbackForm,
  type SubmissionStatus
} from '@/services/formService';
import { useAuth } from '@/context/AuthContext';
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Loader2,
  Building,
  Check,
  Star
} from 'lucide-react';

export function FacultyHistory() {
  const { user } = useAuth();

  const [forms, setForms] = useState<FeedbackForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected form for detail drawer
  const [selectedForm, setSelectedForm] = useState<FeedbackForm | null>(null);
  const [submissionDetail, setSubmissionDetail] = useState<SubmissionStatus | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const facultyForms = await fetchFacultyForms({ submittedOnly: true });
        if (mounted) {
          // Strictly show only surveys that the logged-in faculty member has personally submitted
          const personallySubmitted = (facultyForms || []).filter(f => f.has_submitted);
          setForms(personallySubmitted);
        }
      } catch (err: any) {
        console.warn('[FacultyHistory] fetchFacultyForms error:', err);
        if (mounted) {
          setError(err.message || 'Failed to fetch submitted faculty survey history.');
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

    try {
      setLoadingDetail(true);
      const statusData = await fetchSubmissionStatus(form.id);
      setSubmissionDetail(statusData);
    } catch (err) {
      console.error('[FacultyHistory] Error fetching submission status:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-800">
              <FileText className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              My Survey Feedback History
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Review your submitted feedback responses for official department faculty surveys {user?.department ? `· ${user.department}` : ''}.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <Badge variant="default" className="text-xs bg-purple-500/10 text-purple-300 border-purple-500/30">
            Faculty Role • {user?.department}
          </Badge>
        </div>
      </div>

      {/* Summary KPI Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/20 dark:bg-emerald-950/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-0.5">
                Submitted Surveys
              </p>
              <h3 className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                {forms.length}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={20} />
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

      {/* Loading state */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Loader2 size={32} className="animate-spin mb-3 text-purple-500" />
          <p className="text-sm font-medium">Loading your submitted survey history...</p>
        </div>
      ) : forms.length === 0 ? (
        <EmptyState
          icon={<FileText size={48} />}
          title="No Submitted Surveys"
          message="You have not submitted responses to any department faculty surveys yet."
        />
      ) : (
        <div className="space-y-3">
          {forms.map((form) => {
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
                className="p-5 transition-all hover:border-purple-300 dark:hover:border-purple-700/60"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="positive" className="text-xs">
                        <CheckCircle2 size={12} className="mr-1 inline" /> Submitted
                      </Badge>

                      <Badge variant="low" className="text-xs bg-purple-500/15 text-purple-300 border-purple-500/30">
                        Target: Faculty Members
                      </Badge>

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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDetail(form)}
                      className="text-xs flex items-center gap-1.5 border-purple-500/30 hover:border-purple-400 hover:text-purple-300"
                    >
                      <FileText size={14} /> View Submission Details
                    </Button>
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
        title="Faculty Survey Submission Details"
      >
        {selectedForm && (
          <div className="space-y-5">
            {/* Header Details */}
            <div className="p-4 rounded-xl bg-white/70 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 space-y-2 backdrop-blur-md">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Badge variant="positive">
                  Submitted
                </Badge>
                <div className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                  <ShieldCheck size={14} />
                  <span>Anonymous Faculty Response</span>
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
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Target Cohort:</span> Faculty Members
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
                  <Loader2 size={24} className="animate-spin text-purple-500" />
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
                        <span className="w-5 h-5 rounded-md bg-purple-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
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
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-300 bg-purple-500/15 px-2.5 py-1 rounded-lg border border-purple-500/30">
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

            <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <Button variant="ghost" size="sm" onClick={() => setSelectedForm(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
