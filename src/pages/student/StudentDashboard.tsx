import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Badge, SentimentBadge, StatusBadge } from '@/components/common/UI';
import { AnimatedCounter } from '@/components/common/AnimatedCounter';
import { AIBadge } from '@/components/common/AIExplainer';
import { getAllFeedback, getFeedbackStats, subscribeFeedbackChange } from '@/services/feedbackService';
import { generateNotifications } from '@/services/mockData';
import { useAuth } from '@/context/AuthContext';
import { Sparkles, MessageSquarePlus, CheckCircle, Clock, AlertCircle, TrendingUp, Bell, ChevronRight, ThumbsUp, ThumbsDown, Meh } from 'lucide-react';
import type { Feedback } from '@/types';

const categories = [
  { name: 'Teaching', icon: '📚', color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' },
  { name: 'Laboratory', icon: '🔬', color: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400' },
  { name: 'Internet', icon: '📶', color: 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400' },
  { name: 'Infrastructure', icon: '🏫', color: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400' },
  { name: 'Hostel', icon: '🏠', color: 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400' },
  { name: 'Canteen', icon: '🍽️', color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' },
  { name: 'Transport', icon: '🚌', color: 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400' },
  { name: 'Placement', icon: '🎯', color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' },
  { name: 'Library', icon: '📖', color: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' },
  { name: 'Examination', icon: '📝', color: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' },
];

const emotions = [
  { label: 'Excellent', emoji: '😄', color: 'from-emerald-400 to-emerald-500', textColor: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' },
  { label: 'Good', emoji: '🙂', color: 'from-blue-400 to-blue-500', textColor: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' },
  { label: 'Okay', emoji: '😐', color: 'from-amber-400 to-amber-500', textColor: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' },
  { label: 'Poor', emoji: '😕', color: 'from-orange-400 to-orange-500', textColor: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' },
  { label: 'Very Poor', emoji: '😞', color: 'from-red-400 to-red-500', textColor: 'text-red-700 dark:text-red-300', bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' },
];

export function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [allFeedback, setAllFeedback] = useState<Feedback[]>(getAllFeedback());

  useEffect(() => {
    return subscribeFeedbackChange(newFeedback => {
      setAllFeedback(newFeedback);
    });
  }, []);

  const studentDept = user?.department || 'Artificial Intelligence & Data Science';
  const studentFeedback = allFeedback.filter(f => f.department === studentDept).slice(0, 50);
  const stats = getFeedbackStats(studentDept);
  const notifications = generateNotifications();

  const recentFeedback = studentFeedback.slice(0, 3);
  const underReview = studentFeedback.filter(f => f.status === 'under_review' || f.status === 'received').slice(0, 3);
  const resolved = studentFeedback.filter(f => f.status === 'resolved').slice(0, 3);

  const handleEmotionClick = (emotion: string) => {
    setSelectedEmotion(emotion);
    if (selectedCategory) {
      navigate('/student/feedback');
    }
  };

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
    navigate('/student/feedback', { state: { category, emotion: selectedEmotion } });
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          Welcome back <span className="inline-block animate-bounce">👋</span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Your voice helps improve your institution.</p>
      </div>

      {/* Emotion buttons */}
      <Card className="p-6">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Rate your experience</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {emotions.map(emotion => (
            <button
              key={emotion.label}
              onClick={() => handleEmotionClick(emotion.label)}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-300 hover:scale-105 ${
                selectedEmotion === emotion.label
                  ? `${emotion.bg} border-current shadow-md`
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <span className="text-3xl">{emotion.emoji}</span>
              <span className={`text-xs font-medium ${selectedEmotion === emotion.label ? emotion.textColor : 'text-slate-600 dark:text-slate-400'}`}>
                {emotion.label}
              </span>
            </button>
          ))}
        </div>
      </Card>

      {/* Category cards */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">What would you like to talk about?</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {categories.map(cat => (
            <button
              key={cat.name}
              onClick={() => handleCategoryClick(cat.name)}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ${cat.color}`}
            >
              <span className="text-2xl">{cat.icon}</span>
              <span className="text-xs font-medium">{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5" hover>
          <div className="flex items-center justify-between mb-2">
            <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <MessageSquarePlus size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <ChevronRight size={18} className="text-slate-300" />
          </div>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100"><AnimatedCounter value={stats.total} /></p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Total Feedback Given</p>
        </Card>
        <Card className="p-5" hover>
          <div className="flex items-center justify-between mb-2">
            <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
              <Clock size={20} className="text-amber-600 dark:text-amber-400" />
            </div>
            <ChevronRight size={18} className="text-slate-300" />
          </div>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100"><AnimatedCounter value={stats.underReview} /></p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Under Review</p>
        </Card>
        <Card className="p-5" hover>
          <div className="flex items-center justify-between mb-2">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
              <CheckCircle size={20} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <ChevronRight size={18} className="text-slate-300" />
          </div>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100"><AnimatedCounter value={stats.resolved} /></p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Issues Resolved</p>
        </Card>
      </div>

      {/* Recent feedback + AI assistant CTA */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent feedback */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Recent Feedback</h3>
            <button onClick={() => navigate('/student/history')} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">View all</button>
          </div>
          <div className="space-y-3">
            {recentFeedback.map(fb => (
              <div key={fb.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer" onClick={() => navigate('/student/history')}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="default">{fb.category}</Badge>
                    <SentimentBadge sentiment={fb.sentiment} />
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-200 truncate">{fb.comment}</p>
                  <p className="text-xs text-slate-400 mt-1">{new Date(fb.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                </div>
                <StatusBadge status={fb.status} />
              </div>
            ))}
          </div>
        </Card>

        {/* AI Assistant CTA */}
        <Card className="p-5 bg-gradient-to-br from-violet-50 to-blue-50 dark:from-violet-900/20 dark:to-blue-900/20 border-violet-200 dark:border-violet-800/50">
          <div className="flex items-center gap-2 mb-3">
            <AIBadge>AI Assistant</AIBadge>
          </div>
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shadow-md mb-3">
            <Sparkles size={24} className="text-white" />
          </div>
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">Need help with feedback?</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Our AI assistant helps you turn vague feedback into specific, actionable insights.</p>
          <Button variant="ai" size="sm" onClick={() => navigate('/student/ai-assistant')}>
            <Sparkles size={16} />
            Chat with Assistant
          </Button>
        </Card>
      </div>

      {/* Under review + resolved */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Feedback Under Review</h3>
          {underReview.length > 0 ? (
            <div className="space-y-3">
              {underReview.map(fb => (
                <div key={fb.id} className="flex items-center gap-3 p-3 rounded-xl bg-amber-50/50 dark:bg-amber-900/10">
                  <AlertCircle size={16} className="text-amber-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 dark:text-slate-200 truncate">{fb.comment}</p>
                    <p className="text-xs text-slate-400">{fb.category} · {new Date(fb.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                  </div>
                  <StatusBadge status={fb.status} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-8">No feedback under review</p>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Issues Resolved</h3>
          {resolved.length > 0 ? (
            <div className="space-y-3">
              {resolved.map(fb => (
                <div key={fb.id} className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-900/10">
                  <CheckCircle size={16} className="text-emerald-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 dark:text-slate-200 truncate">{fb.comment}</p>
                    <p className="text-xs text-slate-400">{fb.category} · {new Date(fb.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                  </div>
                  <StatusBadge status={fb.status} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-8">No resolved issues yet</p>
          )}
        </Card>
      </div>
    </div>
  );
}
