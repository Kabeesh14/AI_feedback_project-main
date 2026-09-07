import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Badge, Button, SeverityBadge } from '@/components/common/UI';
import { AIExplainer, AIBadge } from '@/components/common/AIExplainer';
import { AnimatedCounter } from '@/components/common/AnimatedCounter';
import { getFeedbackStats, getSentimentTrend, getTodaysFeedback, subscribeFeedbackChange } from '@/services/feedbackService';
import { getCriticalIssues, getAllIssues, subscribeIssueChange } from '@/services/issueService';
import { getAllAlerts } from '@/services/alertService';
import { getActionStats, subscribeActionChange } from '@/services/actionService';
import { generateDailySummary, generateRecommendations } from '@/services/aiService';
import { Activity, AlertTriangle, MessageSquare, TrendingUp, TrendingDown, Bell, CheckSquare, Zap, Radio, Sparkles, ChevronRight, Brain } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { Severity } from '@/types';

const pulseNodes = [
  { name: 'Teaching', angle: 0, volume: 85, severity: 'medium' as Severity, color: '#3b82f6' },
  { name: 'Labs', angle: 51, volume: 120, severity: 'high' as Severity, color: '#8b5cf6' },
  { name: 'Internet', angle: 102, volume: 95, severity: 'critical' as Severity, color: '#06b6d4' },
  { name: 'Placement', angle: 154, volume: 60, severity: 'high' as Severity, color: '#10b981' },
  { name: 'Infrastructure', angle: 205, volume: 45, severity: 'medium' as Severity, color: '#f97316' },
  { name: 'Hostel', angle: 257, volume: 110, severity: 'critical' as Severity, color: '#ef4444' },
  { name: 'Transport', angle: 308, volume: 55, severity: 'medium' as Severity, color: '#14b8a6' },
];

const severityGlow: Record<Severity, string> = {
  critical: 'shadow-red-500/50',
  high: 'shadow-orange-500/50',
  medium: 'shadow-amber-500/50',
  low: 'shadow-blue-500/50',
};

const severitySize: Record<Severity, number> = {
  critical: 56,
  high: 48,
  medium: 40,
  low: 32,
};

const liveFeedEvents = [
  { time: '10:42 AM', text: '12 new feedback responses received', icon: MessageSquare, color: 'text-blue-500' },
  { time: '10:45 AM', text: 'AI detected recurring issue: "Laboratory Wi-Fi"', icon: Brain, color: 'text-violet-500' },
  { time: '10:48 AM', text: 'Issue priority changed: Medium → High', icon: TrendingUp, color: 'text-orange-500' },
  { time: '10:52 AM', text: 'Corrective action created for Laboratory Systems', icon: CheckSquare, color: 'text-emerald-500' },
  { time: '10:55 AM', text: 'New critical alert: Hostel Water Supply', icon: AlertTriangle, color: 'text-red-500' },
  { time: '11:02 AM', text: 'Improvement detected: Canteen complaints -38%', icon: TrendingDown, color: 'text-green-500' },
];

import type { Department } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { Building } from 'lucide-react';

export function HodDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentDept: Department = user?.department || 'Artificial Intelligence & Data Science';

  const [stats, setStats] = useState(() => getFeedbackStats(currentDept));
  const [trend, setTrend] = useState(() => getSentimentTrend(7, currentDept));
  const [criticalIssues, setCriticalIssues] = useState(() => getCriticalIssues(currentDept));
  const [allIssues, setAllIssues] = useState(() => getAllIssues(currentDept));
  const [todaysCount, setTodaysCount] = useState(() => getTodaysFeedback(currentDept).length);
  const alerts = getAllAlerts(currentDept);
  const actionStats = getActionStats(currentDept);
  const summary = generateDailySummary(currentDept);
  const recommendations = generateRecommendations(currentDept);
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [visibleEvents, setVisibleEvents] = useState(1);

  useEffect(() => {
    setStats(getFeedbackStats(currentDept));
    setTrend(getSentimentTrend(7, currentDept));
    setCriticalIssues(getCriticalIssues(currentDept));
    setAllIssues(getAllIssues(currentDept));
    setTodaysCount(getTodaysFeedback(currentDept).length);
  }, [currentDept]);

  useEffect(() => {
    const unsubFb = subscribeFeedbackChange(() => {
      setStats(getFeedbackStats(currentDept));
      setTrend(getSentimentTrend(7, currentDept));
      setTodaysCount(getTodaysFeedback(currentDept).length);
    });
    const unsubIss = subscribeIssueChange(() => {
      setCriticalIssues(getCriticalIssues(currentDept));
      setAllIssues(getAllIssues(currentDept));
    });
    const unsubAct = subscribeActionChange(() => {
      setCriticalIssues(getCriticalIssues(currentDept));
      setAllIssues(getAllIssues(currentDept));
    });
    return () => {
      unsubFb();
      unsubIss();
      unsubAct();
    };
  }, [currentDept]);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleEvents(prev => Math.min(prev + 1, liveFeedEvents.length));
    }, 800);
    return () => clearInterval(interval);
  }, []);

  const radius = 130;
  const center = 175;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{currentDept} Department Intelligence</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Welcome to your Department Intelligence Center</h1>
        </div>

        {/* Locked Department Badge for HOD (Security-like access) */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 shadow-sm text-emerald-800 dark:text-emerald-200">
            <Building size={16} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold leading-tight">HOD · {currentDept}</p>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Department-scoped view</p>
            </div>
          </div>
          <AIExplainer insightType="priority" />
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-5" hover onClick={() => navigate('/hod/feedback')}>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <MessageSquare size={18} className="text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-xs text-slate-400">Today's Feedback</span>
          </div>
          <p className="text-3xl font-bold text-slate-800 dark:text-slate-100"><AnimatedCounter value={todaysCount > 0 ? todaysCount : 126} /></p>
          <p className="text-xs text-slate-400 mt-1">responses today</p>
        </Card>
        <Card className="p-5" hover onClick={() => navigate('/hod/feedback')}>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
              <TrendingUp size={18} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-xs text-slate-400">Positive</span>
          </div>
          <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400"><AnimatedCounter value={stats.positivePercent || 78} suffix="%" /></p>
          <p className="text-xs text-slate-400 mt-1">of responses</p>
        </Card>
        <Card className="p-5" hover onClick={() => navigate('/hod/issues')}>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-9 w-9 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
              <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-xs text-slate-400">Active Issues</span>
          </div>
          <p className="text-3xl font-bold text-slate-800 dark:text-slate-100"><AnimatedCounter value={allIssues.filter(i => i.status !== 'resolved').length || 14} /></p>
          <p className="text-xs text-slate-400 mt-1">needs attention</p>
        </Card>
        <Card className="p-5" hover onClick={() => navigate('/hod/alerts')}>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-9 w-9 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
              <Zap size={18} className="text-red-600 dark:text-red-400" />
            </div>
            <span className="text-xs text-slate-400">Critical Issues</span>
          </div>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400"><AnimatedCounter value={criticalIssues.length || 4} /></p>
          <p className="text-xs text-slate-400 mt-1">critical alerts</p>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* AI Institutional Pulse */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AIBadge>AI Institutional Pulse</AIBadge>
              <span className="text-xs text-slate-400">Demo Data</span>
            </div>
            <AIExplainer insightType="theme" />
          </div>
          <div className="relative" style={{ height: 350 }}>
            <svg width="100%" height="100%" viewBox="0 0 350 350" className="absolute inset-0">
              {/* Connection lines */}
              {pulseNodes.map((node, i) => {
                const rad = (node.angle * Math.PI) / 180;
                const x = center + radius * Math.cos(rad);
                const y = center + radius * Math.sin(rad);
                const isActive = activeNode === node.name;
                return (
                  <line key={i} x1={center} y1={center} x2={x} y2={y} stroke={isActive ? node.color : '#e2e8f0'} strokeWidth={isActive ? 2 : 1} strokeOpacity={isActive ? 0.6 : 0.3} className="transition-all duration-300" />
                );
              })}
              {/* Center circle */}
              <circle cx={center} cy={center} r="55" fill="none" stroke="#3b82f6" strokeWidth="1" strokeOpacity="0.2" className="animate-pulse" />
              <circle cx={center} cy={center} r="40" fill="#3b82f6" fillOpacity="0.1" />
              <text x={center} y={center - 5} textAnchor="middle" className="fill-slate-600 dark:fill-slate-300" style={{ fontSize: 11, fontWeight: 600 }}>Today's</text>
              <text x={center} y={center + 10} textAnchor="middle" className="fill-slate-600 dark:fill-slate-300" style={{ fontSize: 11, fontWeight: 600 }}>Student Voice</text>
            </svg>
            {/* Pulse nodes */}
            {pulseNodes.map((node, i) => {
              const rad = (node.angle * Math.PI) / 180;
              const x = center + radius * Math.cos(rad);
              const y = center + radius * Math.sin(rad);
              const size = severitySize[node.severity];
              const isActive = activeNode === node.name;
              return (
                <button
                  key={i}
                  onClick={() => setActiveNode(isActive ? null : node.name)}
                  className={`absolute rounded-full transition-all duration-300 ${isActive ? 'scale-125' : 'hover:scale-110'} shadow-lg ${severityGlow[node.severity]}`}
                  style={{
                    width: size,
                    height: size,
                    left: x - size / 2,
                    top: y - size / 2,
                    backgroundColor: node.color,
                    opacity: isActive ? 1 : 0.8,
                  }}
                  title={`${node.name}: ${node.volume} responses, ${node.severity}`}
                >
                  <span className="text-white text-[9px] font-medium absolute inset-0 flex items-center justify-center">{node.name}</span>
                </button>
              );
            })}
            {/* Active node detail */}
            {activeNode && (
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{activeNode}</p>
                    <p className="text-xs text-slate-400">{pulseNodes.find(n => n.name === activeNode)?.volume} responses · Severity: {pulseNodes.find(n => n.name === activeNode)?.severity}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate('/hod/issues')}>View Issues</Button>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Live Feed Stream */}
        <Card className="p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Live Feed</h3>
            </div>
            <span className="text-xs text-red-500 font-medium animate-pulse">LIVE</span>
          </div>
          <div className="space-y-3 flex-1 overflow-hidden">
            {liveFeedEvents.slice(0, visibleEvents).map((event, i) => {
              const Icon = event.icon;
              return (
                <div key={i} className="flex items-start gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                  <div className={`h-8 w-8 rounded-lg bg-slate-50 dark:bg-slate-700/30 flex items-center justify-center flex-shrink-0 ${event.color}`}>
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{event.time}</p>
                    <p className="text-sm text-slate-700 dark:text-slate-200">{event.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <Button variant="ghost" size="sm" className="mt-3" onClick={() => navigate('/hod/feedback')}>View All Feedback</Button>
        </Card>
      </div>

      {/* Sentiment trend + Recommendations */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <Card className="p-5">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">7-Day Sentiment Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="posArea" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                <linearGradient id="negArea" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.3} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
              <Area type="monotone" dataKey="positive" stroke="#10b981" fill="url(#posArea)" strokeWidth={2} />
              <Area type="monotone" dataKey="negative" stroke="#ef4444" fill="url(#negArea)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={18} className="text-violet-500" />
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">AI Recommendations</h3>
            <AIBadge>Today</AIBadge>
          </div>
          <div className="space-y-3">
            {recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                <div className="h-6 w-6 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0 text-xs font-bold text-violet-600 dark:text-violet-400">{i + 1}</div>
                <p className="text-sm text-slate-700 dark:text-slate-200">{rec}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Critical issues preview */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">Critical Issues</h3>
          <Button variant="ghost" size="sm" onClick={() => navigate('/hod/issues')}>View All <ChevronRight size={14} /></Button>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {criticalIssues.map(issue => (
            <div key={issue.id} className="flex items-center gap-3 p-3 rounded-xl bg-red-50/50 dark:bg-red-900/10 cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" onClick={() => navigate(`/hod/issues/${issue.id}`)}>
              <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{issue.title}</p>
                <p className="text-xs text-slate-400">{issue.complaintCount} complaints · {issue.negativePercent}% negative</p>
              </div>
              <ChevronRight size={16} className="text-slate-300" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
