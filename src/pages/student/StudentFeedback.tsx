import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, Button, Badge, SentimentBadge, SeverityBadge } from '@/components/common/UI';
import { AIBadge } from '@/components/common/AIExplainer';
import { addFeedback } from '@/services/feedbackService';
import { analyzeFeedback } from '@/services/aiService';
import { Sparkles, ChevronRight, ChevronLeft, Check, Eye, EyeOff, Send } from 'lucide-react';
import type { Category, Sentiment, Severity } from '@/types';

const categories: { name: Category; icon: string; color: string }[] = [
  { name: 'Teaching', icon: '📚', color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' },
  { name: 'Laboratory', icon: '🔬', color: 'bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800' },
  { name: 'Internet', icon: '📶', color: 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800' },
  { name: 'Infrastructure', icon: '🏫', color: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' },
  { name: 'Hostel', icon: '🏠', color: 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800' },
  { name: 'Canteen', icon: '🍽️', color: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' },
  { name: 'Transport', icon: '🚌', color: 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800' },
  { name: 'Placement', icon: '🎯', color: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' },
  { name: 'Library', icon: '📖', color: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' },
  { name: 'Examination', icon: '📝', color: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' },
];

const emotions = ['Excellent', 'Good', 'Okay', 'Poor', 'Very Poor'];
const emotionSentiments: Record<string, Sentiment> = {
  Excellent: 'positive', Good: 'positive', Okay: 'neutral', Poor: 'negative', 'Very Poor': 'negative',
};

const issueChips: Record<string, string[]> = {
  'Laboratory': ['Slow Computers', 'Missing Software', 'Network Problems', 'Equipment', 'Technical Assistance', 'Other'],
  'Internet': ['Slow Speed', 'Frequent Disconnection', 'No Access', 'Peak Hour Issues', 'Weak Signal', 'Other'],
  'Teaching': ['Pacing', 'Clarity', 'Engagement', 'Materials', 'Assessment', 'Other'],
  'Hostel': ['Water Supply', 'Cleanliness', 'Maintenance', 'Food', 'Safety', 'Other'],
  'Canteen': ['Food Quality', 'Hygiene', 'Pricing', 'Variety', 'Service', 'Other'],
  'Transport': ['Timing', 'Route', 'Bus Condition', 'Crowding', 'Frequency', 'Other'],
  'Placement': ['Training Quality', 'Mock Interviews', 'Company Visits', 'Aptitude Prep', 'Career Guidance', 'Other'],
  'Library': ['Seating', 'Book Availability', 'Noise', 'Hours', 'Digital Resources', 'Other'],
  'Examination': ['Schedule', 'Hall Allocation', 'Question Pattern', 'Evaluation', 'Re-evaluation', 'Other'],
  'Infrastructure': ['Projector', 'AC/Ventilation', 'Furniture', 'Cleanliness', 'Lighting', 'Other'],
};

const frequencies = ['Rarely', 'Sometimes', 'Frequently', 'Almost Every Session'];

import { useAuth } from '@/context/AuthContext';

export function StudentFeedback() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const initialState = location.state as { category?: string; emotion?: string } | null;

  const [step, setStep] = useState(0);
  const [emotion, setEmotion] = useState(initialState?.emotion || '');
  const [category, setCategory] = useState<Category | ''>((initialState?.category as Category | undefined) || '');
  const [issue, setIssue] = useState('');
  const [frequency, setFrequency] = useState('');
  const [details, setDetails] = useState('');
  const [anonymous, setAnonymous] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<ReturnType<typeof analyzeFeedback> | null>(null);

  const steps = ['Emotion', 'Category', 'Issue', 'Frequency', 'Details', 'Review'];

  const handleSubmit = () => {
    const comment = `${emotion} experience with ${category}. Issue: ${issue}. Frequency: ${frequency}. ${details}`.trim();
    const analysis = analyzeFeedback(comment);
    setAiAnalysis(analysis);
    const studentDept = user?.department || 'Artificial Intelligence & Data Science';
    addFeedback({
      date: new Date().toISOString(),
      department: studentDept,
      year: '3rd Year',
      category: category as Category,
      comment,
      sentiment: emotionSentiments[emotion] || 'neutral',
      theme: analysis.theme,
      issue: analysis.issue,
      severity: analysis.severity,
      status: 'received',
      anonymous,
      studentId: anonymous ? 'ANONYMOUS' : 'STU-1001',
    });
    setSubmitted(true);
  };

  const canProceed = () => {
    if (step === 0) return emotion !== '';
    if (step === 1) return category !== '';
    if (step === 2) return issue !== '';
    if (step === 3) return frequency !== '';
    if (step === 4) return true;
    return true;
  };

  if (submitted && aiAnalysis) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="p-8 text-center">
          <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
            <Check size={32} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Feedback Submitted!</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">Your feedback has been received and is being analyzed by our AI system.</p>

          {/* AI Analysis Preview */}
          <div className="bg-violet-50 dark:bg-violet-900/20 rounded-2xl p-5 text-left mb-6">
            <div className="flex items-center gap-2 mb-3">
              <AIBadge>AI Analysis Preview</AIBadge>
              <span className="text-xs text-slate-400">Demo Data</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-400 mb-1">Category</p>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{aiAnalysis.theme}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Issue</p>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{aiAnalysis.issue}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Sentiment</p>
                <SentimentBadge sentiment={aiAnalysis.sentiment} />
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Severity</p>
                <SeverityBadge severity={aiAnalysis.severity} />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-violet-200 dark:border-violet-800/50">
              <p className="text-xs text-slate-400 mb-2">Possible contributing factors identified:</p>
              <div className="flex flex-wrap gap-2">
                {aiAnalysis.possibleCauses.map((cause, i) => (
                  <span key={i} className="text-xs px-2 py-1 rounded-lg bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300">{cause}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate('/student/history')}>View My Feedback</Button>
            <Button onClick={() => navigate('/student/dashboard')}>Back to Dashboard</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center justify-between mb-6">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300 ${
              i === step ? 'bg-blue-600 text-white shadow-md scale-110' :
              i < step ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
            }`}>
              {i < step ? <Check size={14} /> : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 flex-1 mx-1 rounded-full transition-all duration-300 ${i < step ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
            )}
          </div>
        ))}
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">{steps[step]}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Step {step + 1} of {steps.length}</p>

        {/* Step 0: Emotion */}
        {step === 0 && (
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">How was your college experience today?</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {emotions.map(e => {
                const emoji = e === 'Excellent' ? '😄' : e === 'Good' ? '🙂' : e === 'Okay' ? '😐' : e === 'Poor' ? '😕' : '😞';
                return (
                  <button
                    key={e}
                    onClick={() => setEmotion(e)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-300 hover:scale-105 ${
                      emotion === e ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md' : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <span className="text-3xl">{emoji}</span>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{e}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 1: Category */}
        {step === 1 && (
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">What would you like to talk about?</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {categories.map(cat => (
                <button
                  key={cat.name}
                  onClick={() => setCategory(cat.name)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-300 hover:scale-105 ${cat.color} ${
                    category === cat.name ? 'border-current shadow-md ring-2 ring-blue-500/20' : ''
                  }`}
                >
                  <span className="text-2xl">{cat.icon}</span>
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Issue */}
        {step === 2 && category && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <AIBadge>AI Suggested Issues</AIBadge>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">What is the main issue with {category}?</p>
            <div className="flex flex-wrap gap-2">
              {(issueChips[category] || ['Other']).map(chip => (
                <button
                  key={chip}
                  onClick={() => setIssue(chip)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    issue === chip
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Frequency */}
        {step === 3 && (
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">How frequently does this happen?</p>
            <div className="grid grid-cols-2 gap-3">
              {frequencies.map(f => (
                <button
                  key={f}
                  onClick={() => setFrequency(f)}
                  className={`p-4 rounded-xl text-sm font-medium transition-all duration-200 ${
                    frequency === f
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Details */}
        {step === 4 && (
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">Would you like to add any details?</p>
            <textarea
              value={details}
              onChange={e => setDetails(e.target.value)}
              placeholder="Describe your experience in more detail (optional)..."
              rows={5}
              className="w-full p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm resize-none"
            />
            <div className="mt-4 flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30">
              <div className="flex items-center gap-2">
                {anonymous ? <EyeOff size={18} className="text-slate-500" /> : <Eye size={18} className="text-slate-500" />}
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Submit anonymously</p>
                  <p className="text-xs text-slate-400">Your identity will not be displayed in HOD/management analytics.</p>
                </div>
              </div>
              <button
                onClick={() => setAnonymous(!anonymous)}
                className={`relative h-6 w-11 rounded-full transition-colors ${anonymous ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${anonymous ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Review */}
        {step === 5 && (
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">Review your feedback before submitting:</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                <span className="text-sm text-slate-500">Experience</span>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{emotion}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                <span className="text-sm text-slate-500">Category</span>
                <Badge variant="default">{category}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                <span className="text-sm text-slate-500">Issue</span>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{issue}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                <span className="text-sm text-slate-500">Frequency</span>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{frequency}</span>
              </div>
              {details && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                  <p className="text-sm text-slate-500 mb-1">Details</p>
                  <p className="text-sm text-slate-700 dark:text-slate-200">{details}</p>
                </div>
              )}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                <span className="text-sm text-slate-500">Anonymous</span>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{anonymous ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
          <Button variant="ghost" onClick={() => step > 0 ? setStep(step - 1) : navigate('/student/dashboard')}>
            <ChevronLeft size={16} />
            {step > 0 ? 'Back' : 'Cancel'}
          </Button>
          {step < 5 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
              Next
              <ChevronRight size={16} />
            </Button>
          ) : (
            <Button variant="ai" onClick={handleSubmit}>
              <Send size={16} />
              Submit Feedback
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
