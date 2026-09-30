import React, { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button, Badge } from '@/components/common/UI';
import {
  createForm,
  publishForm,
  type CreateFormPayload,
  type CreateQuestionPayload,
  type FeedbackForm
} from '@/services/formService';
import {
  FileText,
  Plus,
  Trash2,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  Sparkles,
  Send,
  Save,
  Layers,
  Star,
  List,
  CheckSquare,
  AlignLeft,
  ChevronRight,
  Loader2,
  Users,
  GraduationCap
} from 'lucide-react';

interface CreateFormModalProps {
  open: boolean;
  onClose: () => void;
  departmentName: string;
  onSuccess: (newForm: FeedbackForm) => void;
}

interface QuestionDraft {
  id: string;
  question_text: string;
  question_type: 'rating' | 'mcq' | 'yes_no' | 'text';
  options: string[];
  is_required: boolean;
}

const TARGET_YEARS = [
  'All Years',
  '1st Year',
  '2nd Year',
  '3rd Year',
  'Final Year'
];

export function CreateFormModal({
  open,
  onClose,
  departmentName,
  onSuccess
}: CreateFormModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetAudience, setTargetAudience] = useState<'student' | 'faculty'>('student');
  const [targetAcademicYear, setTargetAcademicYear] = useState('All Years');
  
  const [questions, setQuestions] = useState<QuestionDraft[]>([
    {
      id: 'q-1',
      question_text: 'How would you rate the overall quality of instruction in your department courses this semester?',
      question_type: 'rating',
      options: [],
      is_required: true
    },
    {
      id: 'q-2',
      question_text: 'Are departmental laboratory equipment and software tools sufficient for practical sessions?',
      question_type: 'yes_no',
      options: [],
      is_required: true
    }
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddQuestion = (type: 'rating' | 'mcq' | 'yes_no' | 'text' = 'rating') => {
    const newId = `q-${Date.now()}`;
    const newQuestion: QuestionDraft = {
      id: newId,
      question_text: '',
      question_type: type,
      options: type === 'mcq' ? ['Option 1', 'Option 2'] : [],
      is_required: true
    };
    setQuestions(prev => [...prev, newQuestion]);
  };

  const handleRemoveQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const handleUpdateQuestion = (id: string, updates: Partial<QuestionDraft>) => {
    setQuestions(prev =>
      prev.map(q => {
        if (q.id !== id) return q;
        const updated = { ...q, ...updates };
        if (updates.question_type && updates.question_type !== q.question_type) {
          if (updates.question_type === 'mcq' && (!updated.options || updated.options.length === 0)) {
            updated.options = ['Option 1', 'Option 2'];
          } else if (updates.question_type !== 'mcq') {
            updated.options = [];
          }
        }
        return updated;
      })
    );
  };

  const handleAddOption = (questionId: string) => {
    setQuestions(prev =>
      prev.map(q => {
        if (q.id !== questionId) return q;
        const nextOptionNumber = (q.options?.length || 0) + 1;
        return {
          ...q,
          options: [...(q.options || []), `Option ${nextOptionNumber}`]
        };
      })
    );
  };

  const handleRemoveOption = (questionId: string, optionIndex: number) => {
    setQuestions(prev =>
      prev.map(q => {
        if (q.id !== questionId) return q;
        const newOptions = (q.options || []).filter((_, idx) => idx !== optionIndex);
        return { ...q, options: newOptions };
      })
    );
  };

  const handleUpdateOption = (questionId: string, optionIndex: number, value: string) => {
    setQuestions(prev =>
      prev.map(q => {
        if (q.id !== questionId) return q;
        const newOptions = [...(q.options || [])];
        newOptions[optionIndex] = value;
        return { ...q, options: newOptions };
      })
    );
  };

  const validate = (): string | null => {
    if (!title.trim() || title.trim().length < 3) {
      return 'Form title is required and must be at least 3 characters.';
    }

    if (questions.length === 0) {
      return 'Please add at least one question to the feedback form.';
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question_text.trim()) {
        return `Question ${i + 1} text cannot be blank.`;
      }
      if (q.question_type === 'mcq') {
        if (!q.options || q.options.length < 2) {
          return `Question ${i + 1} (Multiple Choice) must have at least 2 options.`;
        }
        if (q.options.some(opt => !opt.trim())) {
          return `Question ${i + 1} has empty option choices. Please fill or remove them.`;
        }
      }
    }

    return null;
  };

  const handleSubmit = async (publishImmediately: boolean) => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const payload: CreateFormPayload = {
        title: title.trim(),
        description: description.trim() || null,
        targetAudience,
        target_audience: targetAudience,
        targetAcademicYear: targetAudience === 'student' ? targetAcademicYear.trim() || null : 'Faculty',
        targetSemester: null,
        questions: questions.map((q, idx) => ({
          question_text: q.question_text.trim(),
          question_type: q.question_type,
          options: q.question_type === 'mcq' ? q.options.map(o => o.trim()) : undefined,
          is_required: q.is_required,
          sort_order: idx + 1
        }))
      };

      // 1. Create the draft form
      const createdForm = await createForm(payload);

      // 2. If user chose "Publish Immediately", publish the form
      let finalForm = createdForm;
      if (publishImmediately && createdForm.id) {
        finalForm = await publishForm(createdForm.id);
      }

      onSuccess(finalForm);
      onClose();
    } catch (err: any) {
      console.error('[CreateFormModal error]:', err);
      setError(err.response?.data?.message || err.message || 'Failed to create feedback form.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="xl" title="Create Department Feedback Form">
      <div className="space-y-6">
        {/* Intro banner */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-blue-800 dark:text-blue-300">
          <FileText className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
          <div className="text-sm">
            <span className="font-semibold">Department: {departmentName}</span>
            <p className="text-xs text-blue-700/80 dark:text-blue-400/80 mt-0.5">
              Draft surveys remain private to HOD. Once published, students in {departmentName} can submit anonymous responses.
            </p>
          </div>
        </div>

        {/* Error alert */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50/80 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 flex items-center gap-3 text-sm animate-in fade-in">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {/* Survey Type & Target Audience Selector */}
        <div>
          <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
            Survey Type & Audience <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setTargetAudience('student');
                if (title.includes('Faculty')) {
                  setTitle(title.replace('Faculty', 'Student'));
                }
              }}
              className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                targetAudience === 'student'
                  ? 'border-cyan-500 bg-cyan-500/10 dark:bg-cyan-500/15 shadow-[0_0_15px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <Users className={`w-5 h-5 mt-0.5 flex-shrink-0 ${targetAudience === 'student' ? 'text-cyan-500' : 'text-slate-400'}`} />
              <div>
                <div className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  Student Survey
                  {targetAudience === 'student' && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-500" />}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Sent only to students in {departmentName}.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setTargetAudience('faculty');
                if (title.includes('Student')) {
                  setTitle(title.replace('Student', 'Faculty'));
                }
              }}
              className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                targetAudience === 'faculty'
                  ? 'border-violet-500 bg-violet-500/10 dark:bg-violet-500/15 shadow-[0_0_15px_rgba(139,92,246,0.15)] ring-1 ring-violet-500'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <GraduationCap className={`w-5 h-5 mt-0.5 flex-shrink-0 ${targetAudience === 'faculty' ? 'text-violet-500' : 'text-slate-400'}`} />
              <div>
                <div className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  Faculty Survey
                  {targetAudience === 'faculty' && <CheckCircle2 className="w-3.5 h-3.5 text-violet-500" />}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Sent only to faculty members in {departmentName}.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Form Details Section */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
              Survey Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                targetAudience === 'faculty'
                  ? `e.g., ${departmentName} Faculty Workload & Department Evaluation`
                  : `e.g., ${departmentName} Curriculum & Lab Feedback`
              }
              className="w-full px-4 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 shadow-sm transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
              Description <span className="text-xs font-normal text-slate-400">(Optional)</span>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                targetAudience === 'faculty'
                  ? 'Provide instructions or context for departmental faculty respondents...'
                  : 'Provide context or instructions for student respondents...'
              }
              className="w-full px-4 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 shadow-sm transition-all"
            />
          </div>

          {targetAudience === 'student' ? (
            <div>
              <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                Target Academic Year
              </label>
              <select
                value={targetAcademicYear}
                onChange={(e) => setTargetAcademicYear(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 shadow-sm"
              >
                {TARGET_YEARS.map(yr => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-violet-50/50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/30 text-xs text-violet-700 dark:text-violet-300 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-violet-500 flex-shrink-0" />
              <span>Target Cohort: All verified faculty members assigned to {departmentName}.</span>
            </div>
          )}
        </div>

        {/* Question Builder Section */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Survey Questions</span>
                <Badge variant="default">{questions.length} Total</Badge>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Build questions for students to answer (Rating 1-5, Multiple Choice, Yes/No, or Text).
              </p>
            </div>

            {/* Quick-add buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleAddQuestion('rating')}
                className="text-xs h-8"
              >
                <Star className="w-3.5 h-3.5 mr-1 text-amber-500" /> + Rating
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleAddQuestion('mcq')}
                className="text-xs h-8"
              >
                <List className="w-3.5 h-3.5 mr-1 text-blue-500" /> + MCQ
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleAddQuestion('yes_no')}
                className="text-xs h-8"
              >
                <CheckSquare className="w-3.5 h-3.5 mr-1 text-emerald-500" /> + Yes/No
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleAddQuestion('text')}
                className="text-xs h-8"
              >
                <AlignLeft className="w-3.5 h-3.5 mr-1 text-purple-500" /> + Text
              </Button>
            </div>
          </div>

          {/* Question list */}
          <div className="space-y-4">
            {questions.map((q, idx) => (
              <div
                key={q.id}
                className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3 relative group transition-all"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                      Q{idx + 1}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {q.question_type.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={q.is_required}
                        onChange={(e) => handleUpdateQuestion(q.id, { is_required: e.target.checked })}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Required</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(q.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                      title="Remove question"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-3">
                    <input
                      type="text"
                      value={q.question_text}
                      onChange={(e) => handleUpdateQuestion(q.id, { question_text: e.target.value })}
                      placeholder={`Enter question ${idx + 1} prompt...`}
                      className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 shadow-sm"
                    />
                  </div>

                  <div>
                    <select
                      value={q.question_type}
                      onChange={(e) => handleUpdateQuestion(q.id, { question_type: e.target.value as any })}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 shadow-sm"
                    >
                      <option value="rating">Rating (1–5)</option>
                      <option value="mcq">Multiple Choice</option>
                      <option value="yes_no">Yes / No</option>
                      <option value="text">Free Text</option>
                    </select>
                  </div>
                </div>

                {/* MCQ Options Editor */}
                {q.question_type === 'mcq' && (
                  <div className="p-3 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Options Choices ({q.options.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAddOption(q.id)}
                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <Plus size={12} /> Add Choice
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {q.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-400 w-4 text-center">
                            {String.fromCharCode(65 + optIdx)}.
                          </span>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => handleUpdateOption(q.id, optIdx, e.target.value)}
                            className="flex-1 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
                            placeholder={`Choice ${optIdx + 1}`}
                          />
                          {q.options.length > 2 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveOption(q.id, optIdx)}
                              className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rating Preview */}
                {q.question_type === 'rating' && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>Students will score on a 1 (Very Poor) to 5 (Excellent) numeric scale.</span>
                  </div>
                )}

                {/* Yes/No Preview */}
                {q.question_type === 'yes_no' && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Students select between &quot;Yes&quot; and &quot;No&quot;.</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add Question Button */}
          <button
            type="button"
            onClick={() => handleAddQuestion('rating')}
            className="w-full mt-4 py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-400 hover:border-blue-500 hover:text-blue-600 dark:hover:border-blue-400 dark:hover:text-blue-300 transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={16} /> Add Another Question
          </button>
        </div>

        {/* Modal Actions Footer */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSubmit(false)}
              disabled={loading}
              className="flex-1 sm:flex-initial"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-1.5" /> Save as Draft
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="primary"
              onClick={() => handleSubmit(true)}
              disabled={loading}
              className="flex-1 sm:flex-initial"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Publishing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-1.5" /> Publish Survey
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
