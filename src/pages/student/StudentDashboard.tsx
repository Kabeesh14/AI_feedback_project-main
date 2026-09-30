import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, SentimentBadge, StatusBadge } from '@/components/common/UI';
import { AnimatedCounter } from '@/components/common/AnimatedCounter';
import { AIBadge } from '@/components/common/AIExplainer';
import { getAllFeedback, subscribeFeedbackChange } from '@/services/feedbackService';
import { fetchStudentForms, type FeedbackForm } from '@/services/formService';
import { useAuth } from '@/context/AuthContext';
import {
  Sparkles,
  MessageSquarePlus,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import type { Feedback } from '@/types';

export function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [allFeedback, setAllFeedback] = useState<Feedback[]>(getAllFeedback());
  const [studentForms, setStudentForms] = useState<FeedbackForm[]>([]);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    return subscribeFeedbackChange(newFeedback => {
      setAllFeedback(newFeedback);
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    fetchStudentForms()
      .then(forms => {
        if (mounted) {
          setStudentForms(Array.isArray(forms) ? forms : []);
        }
      })
      .catch(err => {
        console.error('[StudentDashboard] Failed to fetch student forms:', err);
        if (mounted) setStudentForms([]);
      });

    // Trigger staggered entrance
    const timer = setTimeout(() => {
      if (mounted) setRevealed(true);
    }, 100);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, []);

  const studentDept = user?.department || 'Artificial Intelligence & Data Science';
  const studentFeedback = (allFeedback || []).filter(f => f.department === studentDept).slice(0, 50);

  const recentFeedback = studentFeedback.slice(0, 3);
  const underReview = studentFeedback.filter(f => f.status === 'under_review' || f.status === 'received').slice(0, 3);
  const resolved = studentFeedback.filter(f => f.status === 'resolved').slice(0, 3);

  // HOD Survey Form Data metrics
  const formsList = Array.isArray(studentForms) ? studentForms : [];
  const completedSurveys = formsList.filter(f => f && f.has_submitted).length;
  const totalFeedbackGiven = completedSurveys;
  const underReviewCount = formsList.filter(f => f && f.status === 'published').length;

  return (
    <div
      className="relative min-h-[calc(100vh-4rem)] w-full p-6 sm:p-8 lg:p-10 text-slate-100 font-['Onest',sans-serif]"
      style={{
        backgroundColor: 'transparent',
        color: '#eef0f6',
      }}
    >
      {/* Content wrapper with relative positioning above global WebGL canvas */}
      <div className="relative z-10 space-y-6 w-full">
        {/* Top Header & Flowstate Badge */}
        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10 transition-all duration-700"
          style={{
            opacity: revealed ? 1 : 0,
            transform: revealed ? 'translateY(0)' : 'translateY(-12px)',
            transitionTimingFunction: 'cubic-bezier(0.2, 0, 0, 1)',
          }}
        >
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/15 bg-white/[0.08] backdrop-blur-md text-xs font-medium text-slate-300 mb-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>10K+ already in flow</span>
              <span className="opacity-40">·</span>
              <span className="text-cyan-200">{user?.department || 'Department'}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-[#eef0f6]">
              Welcome back <span className="inline-block animate-bounce">👋</span>
            </h1>
            <p className="text-sm text-[#b9becf] mt-1">
              Your voice helps improve your institution. All submissions are anonymous.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-center">
            <button
              onClick={() => navigate('/student/feedback')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-[#2f2f33] text-xs sm:text-sm font-medium hover:bg-white/90 transition-all shadow-md active:scale-95"
            >
              <span>Give Feedback</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* 2. Quick stats KPI Cards in Frosted Dark Glass */}
        <div
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 transition-all duration-700 delay-150"
          style={{
            opacity: revealed ? 1 : 0,
            transform: revealed ? 'translateY(0)' : 'translateY(16px)',
            transitionTimingFunction: 'cubic-bezier(0.2, 0, 0, 1)',
          }}
        >
          {/* Total Feedback Given */}
          <div
            onClick={() => navigate('/student/history')}
            className="p-5 rounded-2xl border border-white/[0.14] bg-white/[0.07] backdrop-blur-xl shadow-xl hover:border-cyan-400/50 hover:bg-white/[0.1] transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
                <MessageSquarePlus size={20} />
              </div>
              <ChevronRight size={18} className="text-slate-400 group-hover:text-white transition-colors" />
            </div>
            <p className="text-3xl font-bold text-[#eef0f6] tracking-tight">
              <AnimatedCounter value={totalFeedbackGiven} />
            </p>
            <p className="text-xs text-[#b9becf] mt-1">Total Feedback Given</p>
          </div>

          {/* Under Review */}
          <div
            onClick={() => navigate('/student/feedback')}
            className="p-5 rounded-2xl border border-white/[0.14] bg-white/[0.07] backdrop-blur-xl shadow-xl hover:border-amber-400/50 hover:bg-white/[0.1] transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                <Clock size={20} />
              </div>
              <ChevronRight size={18} className="text-slate-400 group-hover:text-white transition-colors" />
            </div>
            <p className="text-3xl font-bold text-[#eef0f6] tracking-tight">
              <AnimatedCounter value={underReviewCount} />
            </p>
            <p className="text-xs text-[#b9becf] mt-1">Under Review</p>
          </div>

          {/* Completed Surveys */}
          <div
            onClick={() => navigate('/student/history')}
            className="p-5 rounded-2xl border border-white/[0.14] bg-white/[0.07] backdrop-blur-xl shadow-xl hover:border-emerald-400/50 hover:bg-white/[0.1] transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle size={20} />
              </div>
              <ChevronRight size={18} className="text-slate-400 group-hover:text-white transition-colors" />
            </div>
            <p className="text-3xl font-bold text-[#eef0f6] tracking-tight">
              <AnimatedCounter value={completedSurveys} />
            </p>
            <p className="text-xs text-slate-500 dark:text-[#b9becf] mt-1">Completed Surveys</p>
          </div>
        </div>

        {/* 3. Recent feedback + AI assistant CTA in Frosted Dark Glass */}
        <div
          className="grid lg:grid-cols-3 gap-6 transition-all duration-700 delay-300"
          style={{
            opacity: revealed ? 1 : 0,
            transform: revealed ? 'translateY(0)' : 'translateY(16px)',
            transitionTimingFunction: 'cubic-bezier(0.2, 0, 0, 1)',
          }}
        >
          {/* Recent feedback */}
          <div className="p-5 lg:col-span-2 rounded-2xl border border-white/[0.14] bg-white/[0.07] backdrop-blur-xl shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[#eef0f6]">Recent Feedback</h3>
              <button
                onClick={() => navigate('/student/history')}
                className="text-xs text-cyan-300 hover:text-cyan-200 transition-colors"
              >
                View all
              </button>
            </div>
            <div className="space-y-3">
              {recentFeedback.length === 0 ? (
                <p className="text-sm text-[#b9becf] py-6 text-center">No feedback recorded yet</p>
              ) : (
                recentFeedback.map(fb => (
                  <div
                    key={fb.id}
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/[0.08] border border-white/[0.06] transition-colors cursor-pointer"
                    onClick={() => navigate('/student/history')}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="default" className="text-xs bg-white/10 text-slate-200 border-white/15">
                          {fb.category}
                        </Badge>
                        <SentimentBadge sentiment={fb.sentiment} />
                      </div>
                      <p className="text-sm text-[#eef0f6] truncate">{fb.comment}</p>
                      <p className="text-xs text-[#b9becf] mt-1">
                        {new Date(fb.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <StatusBadge status={fb.status} />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* AI Assistant CTA */}
          <div className="p-5 rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-950/40 via-white/[0.07] to-blue-950/40 backdrop-blur-xl shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AIBadge>AI Assistant</AIBadge>
              </div>
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shadow-lg mb-3">
                <Sparkles size={24} className="text-white" />
              </div>
              <h3 className="font-semibold text-[#eef0f6] mb-1">Need help with feedback?</h3>
              <p className="text-sm text-[#b9becf] mb-4">
                Our AI assistant helps you turn vague feedback into specific, actionable insights.
              </p>
            </div>
            <button
              onClick={() => navigate('/student/ai-assistant')}
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-full bg-white text-[#2f2f33] font-medium text-sm hover:bg-white/90 transition-all shadow-md active:scale-95"
            >
              <Sparkles size={16} />
              <span>Chat with Assistant</span>
            </button>
          </div>
        </div>

        {/* 4. Under review + resolved in Frosted Dark Glass */}
        <div
          className="grid lg:grid-cols-2 gap-6 transition-all duration-700 delay-500"
          style={{
            opacity: revealed ? 1 : 0,
            transform: revealed ? 'translateY(0)' : 'translateY(16px)',
            transitionTimingFunction: 'cubic-bezier(0.2, 0, 0, 1)',
          }}
        >
          {/* Feedback Under Review */}
          <div className="p-5 rounded-2xl border border-white/[0.14] bg-white/[0.07] backdrop-blur-xl shadow-xl">
            <h3 className="font-semibold text-[#eef0f6] mb-4">Feedback Under Review</h3>
            {underReview.length > 0 ? (
              <div className="space-y-3">
                {underReview.map(fb => (
                  <div key={fb.id} className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <AlertCircle size={16} className="text-amber-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#eef0f6] truncate">{fb.comment}</p>
                      <p className="text-xs text-[#b9becf]">
                        {fb.category} · {new Date(fb.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <StatusBadge status={fb.status} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#b9becf] text-center py-8">No feedback under review</p>
            )}
          </div>

          {/* Issues Resolved */}
          <div className="p-5 rounded-2xl border border-white/[0.14] bg-white/[0.07] backdrop-blur-xl shadow-xl">
            <h3 className="font-semibold text-[#eef0f6] mb-4">Issues Resolved</h3>
            {resolved.length > 0 ? (
              <div className="space-y-3">
                {resolved.map(fb => (
                  <div key={fb.id} className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <CheckCircle size={16} className="text-emerald-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#eef0f6] truncate">{fb.comment}</p>
                      <p className="text-xs text-[#b9becf]">
                        {fb.category} · {new Date(fb.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <StatusBadge status={fb.status} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#b9becf] text-center py-8">No resolved issues yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
