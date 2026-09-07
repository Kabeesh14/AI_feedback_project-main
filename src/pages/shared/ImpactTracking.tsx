import { useParams, useNavigate } from 'react-router-dom';
import { Card, Badge, Button, EmptyState, SeverityBadge } from '@/components/common/UI';
import { getAllActions } from '@/services/actionService';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, TrendingUp, TrendingDown, CheckCircle, Clock, AlertTriangle, Calendar } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Area, AreaChart } from 'recharts';
import type { Role } from '@/types';

export function ImpactTracking({ role }: { role: Role }) {
  const { user } = useAuth();
  const effectiveDept = role === 'hod' ? user?.department : (user?.department || undefined);
  const { actionId } = useParams();
  const navigate = useNavigate();
  const actions = getAllActions(effectiveDept);
  const action = actionId ? actions.find(a => a.id === actionId) : actions.find(a => a.impact) || actions[0];

  if (!action) {
    return <EmptyState icon={<TrendingUp size={48} />} title="No actions found" message="Create an action first to track its impact." actionLabel="Back to Actions" onAction={() => navigate(`/${role}/actions`)} />;
  }

  const hasImpact = !!action.impact;
  const beforeData = Array.from({ length: 7 }, (_, i) => ({ day: `Day ${i + 1}`, negative: Math.round(72 - Math.random() * 8) }));
  const afterData = Array.from({ length: 7 }, (_, i) => ({ day: `Day ${i + 1}`, negative: Math.round(31 + Math.random() * 6) }));
  const fullTrend = [...beforeData.map(d => ({ ...d, phase: 'before' })), ...afterData.map(d => ({ ...d, phase: 'after' }))];

  const timeline = [
    { label: 'Problem Detected', date: 'Aug 15', icon: AlertTriangle, color: 'text-red-500 bg-red-50 dark:bg-red-900/20', done: true },
    { label: 'Action Created', date: 'Aug 20', icon: Clock, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20', done: true },
    { label: 'Action Completed', date: 'Aug 28', icon: CheckCircle, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20', done: action.status === 'completed' || hasImpact },
    { label: 'Improvement Observed', date: 'Sep 1', icon: TrendingUp, color: 'text-green-500 bg-green-50 dark:bg-green-900/20', done: hasImpact },
  ];

  return (
    <div>
      <button onClick={() => navigate(`/${role}/actions`)} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors mb-4">
        <ArrowLeft size={16} /> Back to Actions
      </button>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <SeverityBadge severity={action.status === 'completed' ? 'low' : 'high'} />
          <Badge variant="default">{action.department}</Badge>
        </div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Did the Action Work?</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Impact measurement for: {action.action}</p>
      </div>

      {hasImpact ? (
        <>
          {/* Before/After comparison */}
          <div className="grid sm:grid-cols-2 gap-6 mb-6">
            <Card className="p-6">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Before Action</p>
              <p className="text-5xl font-bold text-red-600 dark:text-red-400 mb-2">{action.impact!.beforeNegative}%</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Negative Feedback</p>
              <div className="mt-4 h-2 rounded-full bg-red-200 dark:bg-red-900/30 overflow-hidden">
                <div className="h-full bg-red-500 rounded-full" style={{ width: `${action.impact!.beforeNegative}%` }} />
              </div>
            </Card>
            <Card className="p-6">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">After Action</p>
              <p className="text-5xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">{action.impact!.afterNegative}%</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Negative Feedback</p>
              <div className="mt-4 h-2 rounded-full bg-emerald-200 dark:bg-emerald-900/30 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${action.impact!.afterNegative}%` }} />
              </div>
            </Card>
          </div>

          {/* Improvement banner */}
          <Card className="p-6 mb-6 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border-emerald-200 dark:border-emerald-800/50">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-emerald-500 flex items-center justify-center shadow-md">
                <TrendingUp size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-emerald-700 dark:text-emerald-300">Improvement Detected</h3>
                <p className="text-sm text-emerald-600 dark:text-emerald-400">+{action.impact!.improvement} percentage points reduction in negative feedback</p>
              </div>
            </div>
          </Card>

          {/* Before/After trend chart */}
          <Card className="p-5 mb-6">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Before vs After Trend</h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={fullTrend}>
                <defs>
                  <linearGradient id="beforeGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
                  <linearGradient id="afterGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.3} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" domain={[0, 100]} />
                <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
                <ReferenceLine x="Day 7" stroke="#94a3b8" strokeDasharray="5 5" label={{ value: 'Action', position: 'top', fontSize: 10, fill: '#94a3b8' }} />
                <Area type="monotone" dataKey="negative" stroke="#ef4444" fill="url(#beforeGrad)" strokeWidth={2} name="Before" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Additional metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-2"><TrendingDown size={16} className="text-emerald-500" /><span className="text-xs text-slate-400">Complaint Frequency</span></div>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">-54%</p>
              <p className="text-xs text-slate-400 mt-1">Daily complaints reduced</p>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-2"><TrendingUp size={16} className="text-emerald-500" /><span className="text-xs text-slate-400">Sentiment Change</span></div>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">+41 pts</p>
              <p className="text-xs text-slate-400 mt-1">Positive sentiment increase</p>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-2"><CheckCircle size={16} className="text-emerald-500" /><span className="text-xs text-slate-400">Recurrence Rate</span></div>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">Low</p>
              <p className="text-xs text-slate-400 mt-1">Issue not recurring</p>
            </Card>
          </div>
        </>
      ) : (
        <Card className="p-12 text-center mb-6">
          <Clock size={40} className="text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">Impact Not Yet Available</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">This action is currently <span className="font-medium">{action.status.replace('_', ' ')}</span>. Impact measurement will be available once the action is completed and sufficient post-action feedback is collected.</p>
        </Card>
      )}

      {/* Timeline */}
      <Card className="p-5">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Action Timeline</h3>
        <div className="space-y-4">
          {timeline.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={i} className="flex items-center gap-3">
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${step.done ? step.color : 'bg-slate-100 dark:bg-slate-700/50 text-slate-400'}`}>
                  <Icon size={16} />
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${step.done ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400'}`}>{step.label}</p>
                  <p className="text-xs text-slate-400 flex items-center gap-1"><Calendar size={10} /> {step.date}</p>
                </div>
                {step.done && <CheckCircle size={16} className="text-emerald-500" />}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
