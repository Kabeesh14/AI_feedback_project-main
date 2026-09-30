import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, Badge, Button, SeverityBadge } from '@/components/common/UI';
import { AIBadge } from '@/components/common/AIExplainer';
import { AnimatedCounter } from '@/components/common/AnimatedCounter';
import { fetchInstitutionStats, fetchTrends } from '@/services/analyticsService';
import { 
  Activity, 
  AlertTriangle, 
  MessageSquare, 
  TrendingUp, 
  ChevronRight, 
  Brain, 
  History, 
  Building,
  CheckCircle2
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { Department } from '@/types';
import { useAuth } from '@/context/AuthContext';

interface DashboardData {
  department: string;
  kpis: {
    totalFeedback: number;
    todayFeedback: number;
    weeklyFeedback: number;
    averageRating: number;
    satisfactionRate: number;
    negativeRate: number;
    activeIssues: number;
    criticalIssues: number;
    resolvedFeedback: number;
    emergingIssueCount: number;
    pulseScore: number;
  };
  pulse?: {
    score: number;
    trend: string;
    explanation: string;
  };
  sentimentDistribution?: {
    positive: number;
    neutral: number;
    negative: number;
  };
  topThemes?: Array<{
    name: string;
    category: string;
    responses: number;
    averageRating: number;
    positivePercent: number;
    negativePercent: number;
    priority: string;
  }>;
  topIssues?: Array<{
    id: string;
    issueCode: string;
    title: string;
    department: string;
    category: string;
    priority: string;
    severity: string;
    status: string;
    feedbackCount: number;
    impactScore: number;
    isEmerging: boolean;
    emergingReason: string | null;
  }>;
}

export function FacultyDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentDept: Department = user?.department || 'Artificial Intelligence & Data Science';

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [trend, setTrend] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;

    fetchInstitutionStats(currentDept)
      .then((data) => {
        if (isMounted && data) {
          setDashboardData(data);
        }
      })
      .catch((err) => {
        console.error('[FacultyDashboard] Failed to load dashboard metrics:', err);
      });

    fetchTrends(7, currentDept)
      .then((trendRes) => {
        if (isMounted && trendRes?.series) {
          setTrend(trendRes.series);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [currentDept]);

  const kpis = dashboardData?.kpis;
  const totalFeedback = kpis?.totalFeedback ?? 0;
  const satisfactionRate = kpis?.satisfactionRate ?? 0;
  const positiveCount = dashboardData?.sentimentDistribution?.positive ?? 0;
  const activeIssuesCount = kpis?.activeIssues ?? 0;
  const criticalIssuesCount = kpis?.criticalIssues ?? 0;
  const healthScore = dashboardData?.pulse?.score ?? kpis?.pulseScore ?? (totalFeedback > 0 ? Math.round(100 - (kpis?.negativeRate ?? 0)) : 0);
  
  const pulseExplanation = dashboardData?.pulse?.explanation || (
    totalFeedback > 0 
      ? `Today, ${totalFeedback} departmental feedback responses analyzed. Overall satisfaction is ${satisfactionRate}% with ${activeIssuesCount} active issues monitored.`
      : `No active departmental feedback recorded for ${currentDept} today. Operational metrics are in baseline status.`
  );

  const liveInsights: string[] = [];
  if (dashboardData?.topIssues && dashboardData.topIssues.length > 0) {
    dashboardData.topIssues.slice(0, 2).forEach((iss) => {
      if (iss.emergingReason) {
        liveInsights.push(`${iss.title}: ${iss.emergingReason}`);
      } else {
        liveInsights.push(`${iss.priority.toUpperCase()} Priority: ${iss.title} (${iss.feedbackCount} reports, Impact: ${iss.impactScore}/100)`);
      }
    });
  }
  if (liveInsights.length < 2 && dashboardData?.topThemes && dashboardData.topThemes.length > 0) {
    dashboardData.topThemes.slice(0, 2 - liveInsights.length).forEach((thm) => {
      liveInsights.push(`${thm.name} category: ${thm.negativePercent}% negative sentiment across ${thm.responses} feedback responses.`);
    });
  }
  if (liveInsights.length === 0) {
    liveInsights.push(`Operational monitoring active for ${currentDept}.`);
  }

  const departmentIssues = dashboardData?.topIssues || [];

  return (
    <div className="space-y-6">
      {/* Header with Department Badge */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Faculty Dashboard</h1>
            <AIBadge variant="subtle" />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300 border border-teal-300 dark:border-teal-800">
              <Building size={14} />
              {currentDept}
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Department Intelligence & Faculty Feedback Portal
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/faculty/history">
            <Button variant="secondary" className="flex items-center gap-2">
              <History size={18} />
              My History
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Department Feedback</span>
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
              <MessageSquare size={20} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-slate-800 dark:text-slate-100">
              <AnimatedCounter value={totalFeedback} />
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Institutional feedback collected for {currentDept}
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Positive Sentiment</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-800 dark:text-slate-100">
              <AnimatedCounter value={satisfactionRate} suffix="%" />
            </span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {positiveCount} positive
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Student and faculty satisfaction benchmark
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Active Issues</span>
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-800 dark:text-slate-100">
              <AnimatedCounter value={activeIssuesCount} />
            </span>
            {criticalIssuesCount > 0 && (
              <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                {criticalIssuesCount} critical
              </span>
            )}
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Identified departmental operational issues
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Department Health</span>
            <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400">
              <Activity size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-800 dark:text-slate-100">
              <AnimatedCounter value={healthScore} />
            </span>
            <span className="text-xs text-slate-400">/ 100</span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Computed sentiment health index
          </p>
        </Card>
      </div>

      {/* Main Grid: Sentiment Trends & AI Daily Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-Day Sentiment Trend */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">7-Day Sentiment Trend</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Daily breakdown of positive, neutral, and negative feedback</p>
            </div>
            <Badge variant="blue">Real-time</Badge>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="positiveGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="negativeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />
                <Area type="monotone" dataKey="positive" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#positiveGrad)" name="Positive" />
                <Area type="monotone" dataKey="negative" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#negativeGrad)" name="Negative" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* AI Department Summary */}
        <Card className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
                <Brain size={18} />
              </div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">AI Daily Summary</h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {pulseExplanation}
            </p>

            <div className="mt-5">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Key AI Insights</h3>
              <ul className="space-y-2">
                {liveInsights.map((rec, i) => (
                  <li key={i} className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                    <CheckCircle2 size={14} className="text-teal-500 shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      </div>

      {/* Department Issues Preview (View Only - No Action Modifications) */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Department Issues</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Active student and faculty concerns in {currentDept} (Read-only view)
            </p>
          </div>
          <Link to="/faculty/issues">
            <Button variant="ghost" size="sm" className="flex items-center gap-1 text-xs">
              View All Issues
              <ChevronRight size={14} />
            </Button>
          </Link>
        </div>

        {departmentIssues.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-500">
            No active issues identified in {currentDept}.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {departmentIssues.slice(0, 4).map((issue) => (
              <div key={issue.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <SeverityBadge severity={(issue.severity || issue.priority || 'medium').toLowerCase() as any} />
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{issue.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Category: <span className="font-medium text-slate-700 dark:text-slate-300">{issue.category}</span> · Complaints: {issue.feedbackCount}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={issue.status === 'resolved' ? 'green' : 'amber'}>
                    {(issue.status || 'open').replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
