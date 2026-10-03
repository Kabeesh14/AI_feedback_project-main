import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Button, Badge } from '@/components/common/UI';
import {
  fetchStudentForms,
  fetchFormById,
  submitFormResponse,
  type FeedbackForm,
  type FormQuestion,
  type FormAnswerSubmission
} from '@/services/formService';
import { useAuth } from '@/context/AuthContext';
import {
  FileText,
  Star,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowLeft,
  Send,
  Loader2,
  ShieldCheck,
  Check,
  List,
  Sparkles,
  ChevronRight,
  RefreshCw
} from 'lucide-react';

export function StudentFeedback() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const formIdParam = searchParams.get('formId');

  const [forms, setForms] = useState<FeedbackForm[]>([]);
  const [loadingForms, setLoadingForms] = useState<boolean>(true);
  const [selectedForm, setSelectedForm] = useState<FeedbackForm | null>(null);
  const [loadingFormDetail, setLoadingFormDetail] = useState<boolean>(false);

  // Form answer state: mapping of question_id -> { rating_value, selected_option, text_response }
  const [answers, setAnswers] = useState<Record<number, {
    rating_value?: number;
    selected_option?: string;
    text_response?: string;
  }>>({});

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  // Load student forms on mount
  useEffect(() => {
    let mounted = true;
    async function loadForms() {
      try {
        setLoadingForms(true);
        const list = await fetchStudentForms();
        if (mounted) {
          setForms(list);
        }
      } catch (err) {
        console.error('[StudentFeedback] Failed to fetch student forms:', err);
      } finally {
        if (mounted) setLoadingForms(false);
      }
    }
    loadForms();
    return () => { mounted = false; };
  }, []);

  // When forms load or formIdParam changes, select the target form
  useEffect(() => {
    if (forms.length === 0) return;

    let targetId: number | null = null;
    if (formIdParam) {
      const parsed = parseInt(formIdParam, 10);
      if (!isNaN(parsed) && forms.some(f => f.id === parsed)) {
        targetId = parsed;
      }
    }

    // If no specific valid formId in URL, default to the first unsubmitted form or first form
    if (!targetId && forms.length > 0) {
      const unsubmitted = forms.find(f => !f.has_submitted);
      targetId = unsubmitted ? unsubmitted.id : forms[0].id;
    }

    if (targetId && (!selectedForm || selectedForm.id !== targetId)) {
      handleSelectForm(targetId);
    }
  }, [forms, formIdParam]);

  const handleSelectForm = async (formId: number) => {
    try {
      setLoadingFormDetail(true);
      setSubmitError(null);
      setSubmitSuccess(false);
      const detail = await fetchFormById(formId);
      setSelectedForm(detail);
      setSearchParams({ formId: String(formId) });

      // Initialize empty answer map
      const initialAnswers: Record<number, any> = {};
      if (detail?.questions) {
        for (const q of detail.questions) {
          initialAnswers[q.id] = {
            rating_value: undefined,
            selected_option: undefined,
            text_response: ''
          };
        }
      }
      setAnswers(initialAnswers);
    } catch (err: any) {
      console.error('[StudentFeedback] Error loading form details:', err);
      setSubmitError('Failed to load survey questions.');
    } finally {
      setLoadingFormDetail(false);
    }
  };

  const handleSetRating = (questionId: number, rating: number) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        rating_value: rating
      }
    }));
  };

  const handleSetOption = (questionId: number, option: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        selected_option: option
      }
    }));
  };

  const handleSetText = (questionId: number, text: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        text_response: text
      }
    }));
  };

  const validateSubmission = (): string | null => {
    if (!selectedForm || !selectedForm.questions || selectedForm.questions.length === 0) {
      return 'Survey does not contain questions.';
    }

    for (let i = 0; i < selectedForm.questions.length; i++) {
      const q = selectedForm.questions[i];
      const ans = answers[q.id];

      if (q.is_required) {
        if (q.question_type === 'rating' && (!ans || !ans.rating_value)) {
          return `Please provide a rating for Question ${i + 1}.`;
        }
        if (q.question_type === 'mcq' && (!ans || !ans.selected_option)) {
          return `Please select an option for Question ${i + 1}.`;
        }
        if (q.question_type === 'yes_no' && (!ans || !ans.selected_option)) {
          return `Please select Yes or No for Question ${i + 1}.`;
        }
        if (q.question_type === 'text' && (!ans || !ans.text_response?.trim())) {
          return `Please provide a written response for Question ${i + 1}.`;
        }
      }
    }

    return null;
  };

  const handleSubmit = async () => {
    if (!selectedForm) return;

    const validationError = validateSubmission();
    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    setSubmitError(null);
    setSubmitting(true);

    try {
      const payloadAnswers: FormAnswerSubmission[] = (selectedForm.questions || []).map(q => {
        const ans = answers[q.id] || {};
        return {
          question_id: q.id,
          rating_value: q.question_type === 'rating' ? ans.rating_value : undefined,
          selected_option: (q.question_type === 'mcq' || q.question_type === 'yes_no') ? ans.selected_option : undefined,
          text_response: q.question_type === 'text' ? ans.text_response?.trim() : undefined
        };
      });

      await submitFormResponse(selectedForm.id, payloadAnswers, null);
      setSubmitSuccess(true);

      // Update the form status locally and in forms list
      setSelectedForm(prev => prev ? { ...prev, has_submitted: true } : null);
      setForms(prev => prev.map(f => f.id === selectedForm.id ? { ...f, has_submitted: true } : f));
    } catch (err: any) {
      console.error('[StudentFeedback] submit error:', err);
      setSubmitError(err.response?.data?.message || err.message || 'Failed to submit feedback response.');
    } finally {
      setSubmitting(false);
    }
  };

  const ratingLabels: Record<number, string> = {
    1: 'Very Poor',
    2: 'Poor',
    3: 'Average',
    4: 'Good',
    5: 'Excellent'
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
              <FileText className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Department Feedback Surveys
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Submit anonymous feedback on official surveys published by your Head of Department ({user?.department || 'Department'}).
          </p>
        </div>

        {/* Department Badge */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <Badge variant="default" className="text-xs">
            {user?.department}
          </Badge>
        </div>
      </div>

      {/* Loading state */}
      {loadingForms && (
        <div className="p-12 text-center text-slate-400 dark:text-slate-500 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-sm font-medium">Loading published department surveys...</p>
        </div>
      )}

      {/* No surveys available */}
      {!loadingForms && forms.length === 0 && (
        <Card className="p-12 text-center text-slate-500 dark:text-slate-400">
          <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-1">
            No Published Surveys Available
          </h3>
          <p className="text-sm max-w-md mx-auto mb-6">
            Your Head of Department has not published any surveys for your department at this time. When a new survey is announced, it will appear here.
          </p>
          <Button variant="outline" size="sm" onClick={() => navigate('/student/dashboard')}>
            Return to Dashboard
          </Button>
        </Card>
      )}

      {/* Main survey view */}
      {!loadingForms && forms.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Survey Selector List (Left Column) */}
          <div className="space-y-3 lg:col-span-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
              Published Surveys ({forms.length})
            </h2>

            <div className="space-y-2">
              {forms.map(f => {
                const isSelected = selectedForm?.id === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => handleSelectForm(f.id)}
                    className={`w-full text-left p-3.5 rounded-xl border backdrop-blur-md transition-all ${
                      isSelected
                        ? 'bg-cyan-500/15 dark:bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                        : 'bg-white/70 dark:bg-white/[0.04] border-slate-200/80 dark:border-white/10 hover:border-cyan-400/40 dark:hover:border-cyan-400/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        {f.target_academic_year || 'All Years'}
                      </span>
                      {f.has_submitted ? (
                        <Badge variant="positive" className="text-[10px] py-0.5 px-2">
                          <CheckCircle2 size={11} className="mr-1 inline" /> Submitted
                        </Badge>
                      ) : (
                        <Badge variant="warning" className="text-[10px] py-0.5 px-2">
                          <Clock size={11} className="mr-1 inline" /> Pending
                        </Badge>
                      )}
                    </div>
                    <h3 className={`text-sm font-semibold line-clamp-1 ${
                      isSelected ? 'text-blue-900 dark:text-blue-200' : 'text-slate-800 dark:text-slate-200'
                    }`}>
                      {f.title}
                    </h3>
                    {f.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {f.description}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Survey Questions & Submission Form (Right Column) */}
          <div className="lg:col-span-2">
            {loadingFormDetail && (
              <Card className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <p className="text-sm font-medium">Loading survey questions...</p>
              </Card>
            )}

            {!loadingFormDetail && selectedForm && (
              <div className="space-y-6">
                {/* Form Header Card */}
                <Card className="p-6 border-cyan-500/20 bg-white/70 dark:bg-white/[0.06] backdrop-blur-xl">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="default" className="text-xs">
                          {selectedForm.department}
                        </Badge>
                        {selectedForm.target_academic_year && (
                          <Badge variant="low" className="text-xs">
                            Target: {selectedForm.target_academic_year}
                          </Badge>
                        )}
                        {selectedForm.has_submitted && (
                          <Badge variant="positive" className="text-xs">
                            <CheckCircle2 size={12} className="mr-1 inline" /> You have submitted this survey
                          </Badge>
                        )}
                      </div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                        {selectedForm.title}
                      </h2>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-200/60 dark:border-emerald-800/60 flex-shrink-0">
                      <ShieldCheck size={14} />
                      <span className="font-semibold">Anonymous Feedback</span>
                    </div>
                  </div>

                  {selectedForm.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {selectedForm.description}
                    </p>
                  )}
                </Card>

                {/* Error Banner */}
                {submitError && (
                  <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 flex items-center gap-3 text-sm animate-in fade-in">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
                    <div className="flex-1 font-medium">{submitError}</div>
                  </div>
                )}

                {/* Success Banner */}
                {submitSuccess && (
                  <Card className="p-8 text-center bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 mx-auto mb-3 flex items-center justify-center">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-200 mb-1">
                      Feedback Submitted Successfully!
                    </h3>
                    <p className="text-sm text-emerald-700 dark:text-emerald-400 max-w-md mx-auto mb-4">
                      Your responses were securely and anonymously submitted. Your input will be aggregated into the department&apos;s collective AI analytics to drive departmental improvements.
                    </p>
                    <Button variant="outline" size="sm" onClick={() => navigate('/student/dashboard')}>
                      Return to Dashboard
                    </Button>
                  </Card>
                )}

                {/* Already Submitted State */}
                {selectedForm.has_submitted && !submitSuccess && (
                  <Card className="p-8 text-center bg-white/60 dark:bg-white/[0.04] border-slate-200/80 dark:border-white/10 backdrop-blur-xl">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">
                      Already Submitted
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-4">
                      You have already submitted your response for this survey. To protect response integrity, multiple submissions are not permitted.
                    </p>
                    <Button variant="outline" size="sm" onClick={() => navigate('/student/dashboard')}>
                      View Other Surveys
                    </Button>
                  </Card>
                )}

                {/* Question Response Form */}
                {!selectedForm.has_submitted && !submitSuccess && (
                  <div className="space-y-5">
                    {(selectedForm.questions || []).map((q, idx) => (
                      <Card key={q.id} className="p-5 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5">
                            <span className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <div>
                              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                                {q.question_text}
                                {q.is_required && <span className="text-rose-500 ml-1">*</span>}
                              </h3>
                              <p className="text-xs text-slate-400 mt-0.5 uppercase tracking-wider">
                                {q.question_type.replace('_', ' ')}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Rating (1-5) Input */}
                        {q.question_type === 'rating' && (
                          <div className="pt-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              {[1, 2, 3, 4, 5].map(starVal => {
                                const isSelected = answers[q.id]?.rating_value === starVal;
                                return (
                                  <button
                                    key={starVal}
                                    type="button"
                                    onClick={() => handleSetRating(q.id, starVal)}
                                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold border backdrop-blur-md transition-all ${
                                      isSelected
                                        ? 'bg-amber-500 border-amber-400 text-white shadow-[0_0_15px_rgba(245,158,11,0.3)] scale-105'
                                        : 'bg-white/70 dark:bg-white/[0.04] border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-amber-400/50'
                                    }`}
                                  >
                                    <Star className={`w-4 h-4 ${isSelected ? 'fill-white' : 'text-amber-400'}`} />
                                    <span>{starVal}</span>
                                    <span className="text-xs font-normal opacity-90 hidden sm:inline">
                                      ({ratingLabels[starVal]})
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                            {answers[q.id]?.rating_value && (
                              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-2">
                                Selected: {answers[q.id]?.rating_value} — {ratingLabels[answers[q.id]?.rating_value!]}
                              </p>
                            )}
                          </div>
                        )}

                        {/* MCQ Input */}
                        {q.question_type === 'mcq' && (
                          <div className="pt-2 space-y-2">
                            {(q.options || []).map((opt, optIdx) => {
                              const isSelected = answers[q.id]?.selected_option === opt;
                              return (
                                <button
                                  key={optIdx}
                                  type="button"
                                  onClick={() => handleSetOption(q.id, opt)}
                                  className={`w-full flex items-center justify-between p-3 rounded-xl border backdrop-blur-md text-left text-sm transition-all ${
                                    isSelected
                                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-semibold shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                                      : 'bg-white/70 dark:bg-white/[0.04] border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-white/[0.08]'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold ${
                                      isSelected
                                        ? 'border-cyan-400 bg-cyan-500 text-white shadow-sm'
                                        : 'border-slate-300 dark:border-white/20 text-slate-400'
                                    }`}>
                                      {String.fromCharCode(65 + optIdx)}
                                    </span>
                                    <span>{opt}</span>
                                  </div>
                                  {isSelected && <Check className="w-4 h-4 text-cyan-400" />}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Yes / No Input */}
                        {q.question_type === 'yes_no' && (
                          <div className="pt-2 flex items-center gap-3">
                            {['Yes', 'No'].map(choice => {
                              const isSelected = answers[q.id]?.selected_option === choice;
                              return (
                                <button
                                  key={choice}
                                  type="button"
                                  onClick={() => handleSetOption(q.id, choice)}
                                  className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold border text-center transition-all ${
                                    isSelected
                                      ? (choice === 'Yes'
                                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                                          : 'bg-rose-600 text-white border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)]')
                                      : 'bg-white/70 dark:bg-white/[0.04] border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-white/[0.08]'
                                  }`}
                                >
                                  {choice}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Free Text Input */}
                        {q.question_type === 'text' && (
                          <div className="pt-2">
                            <textarea
                              rows={3}
                              value={answers[q.id]?.text_response || ''}
                              onChange={(e) => handleSetText(q.id, e.target.value)}
                              placeholder="Type your response here..."
                              className="w-full p-3 text-sm bg-white/70 dark:bg-white/[0.04] border border-slate-200 dark:border-white/15 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400/50 text-slate-900 dark:text-slate-100 placeholder-slate-400 backdrop-blur-md shadow-sm"
                            />
                          </div>
                        )}
                      </Card>
                    ))}

                    {/* Submit Button Bar */}
                    <div className="pt-4 flex items-center justify-between gap-4">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => navigate('/student/dashboard')}
                      >
                        Cancel
                      </Button>

                      <Button
                        type="button"
                        variant="primary"
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="px-6 shadow-md flex items-center gap-2"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" /> Submit Survey Feedback
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
