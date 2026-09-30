import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Badge, Button, EmptyState, SeverityBadge } from '@/components/common/UI';
import { getAllActions, fetchActions } from '@/services/actionService';
import { apiClient } from '@/services/apiClient';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, TrendingUp, TrendingDown, CheckCircle, Clock, AlertTriangle, Calendar, ShieldCheck, Loader2 } from 'lucide-react';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, BarChart, Bar, Legend } from 'recharts';
import type { Role } from '@/types';

export function ImpactTracking({ role }: { role: Role }) {
  const { user } = useAuth();
  const effectiveDept = role === 'hod' ? user?.department : (user?.department || undefined);
  const { actionId } = useParams();
  const navigate = useNavigate();

  const [actions, setActions] = useState(() => getAllActions(effectiveDept));
  const [evaluation, setEvaluation] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadActions() {
      try {
        const live = await fetchActions(effectiveDept);
        if (mounted) setActions(live);
      } catch {
        if (mounted) setActions(getAllActions(effectiveDept));
      }
    }
    loadActions();
    return () => { mounted = false; };
  }, [effectiveDept]);

  const action = actionId ? actions.find(a => a.id === actionId) : actions.find(a => a.impact) || actions[0];

  useEffect(() => {
    let mounted = true;
    if (action?.id) {
      setLoading(true);
      setError(null);
      apiClient.get(`/impact/${action.id}`)
        .then(res => {
          if (mounted && res.success) {
            setEvaluation(res.data);
          }
        })
        .catch(err => {
          console.warn('[ImpactTracking] Failed to fetch impact:', err);
          if (mounted && err.status !== 401 && err.status !== 403) {
            setError(err.message);
          }
        })
        .finally(() => {
          if (mounted) setLoading(false);
        });
    } else {
      setLoading(false);
    }
    return () => { mounted = false; };
  }, [action?.id]);

  if (!action) {
    return (
      <EmptyState
        icon={<TrendingUp size={48} />}
        title="No actions found"
        message="Create an action first to track its impact."
        actionLabel="Back to Actions"
        onAction={() => navigate(`/${role}/actions`)}
      />
    );
  }

  // Derive metrics from backend evaluation if available, or fallback to action.impact
  const dataSufficient = evaluation ? evaluation.dataSufficient : (action.status === 'completed' || !!action.impact);
  const isCompleted = action.status === 'completed';

  const beforeNeg = evaluation?.before?.negativePercent ?? action.impact?.beforeNegative ?? 0;
  const afterNeg = evaluation?.after?.negativePercent ?? action.impact?.afterNegative ?? 0;
  const improvement = evaluation?.changes?.improvementPoints ?? action.impact?.improvement ?? Math.max(0, beforeNeg - afterNeg);
  const confidence = evaluation?.confidence ?? 0;
  const evalType = evaluation?.evaluation ?? (improvement >= 15 ? 'effective' : improvement > 0 ? 'partially_effective' : 'not_effective');

  const comparisonData = [
    {
      window: 'Pre-Action Baseline',
      negativePercent: beforeNeg,
      positivePercent: evaluation?.before?.positivePercent ?? Math.max(0, 100 - beforeNeg),
    },
    {
      window: 'Post-Action Window',
      negativePercent: afterNeg,
      positivePercent: evaluation?.after?.positivePercent ?? Math.max(0, 100 - afterNeg),
    },
  ];

  const formatDate = (d?: string | null) => {
    if (!d) return '—';
    try {
      const parsed = new Date(d);
      return isNaN(parsed.getTime()) ? d : parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return d;
    }
  };

  const timeline = [
    { label: 'Problem Detected', date: formatDate(action.createdAt), icon: AlertTriangle, color: 'text-red-500 bg-red-50 dark:bg-red-900/20', done: true },
    { label: 'Action Created', date: formatDate(action.createdAt), icon: Clock, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20', done: true },
    { label: 'Action Completed', date: isCompleted ? formatDate(action.deadline) : 'Pending', icon: CheckCircle, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20', done: isCompleted },
    { label: 'Evidence Observed', date: dataSufficient ? formatDate(evaluation?.evaluatedAt) : 'Awaiting data', icon: TrendingUp, color: 'text-green-500 bg-green-50 dark:bg-green-900/20', done: isCompleted && dataSufficient },
  ];

  return (
    <div>
      <button onClick={() => navigate(`/${role}/actions`)} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors mb-4">
        <ArrowLeft size={16} /> Back to Actions
      </button>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <SeverityBadge severity={isCompleted ? 'low' : 'high'} />
          <Badge variant="default">{action.department}</Badge>
          {dataSufficient && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              <ShieldCheck size={12} /> {confidence}% Confidence
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Did the Action Work?</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Impact measurement for: {action.action}</p>
      </div>

      {loading ? (
        <Card className="p-12 text-center mb-6">
          <Loader2 size={36} className="animate-spin text-blue-500 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Evaluating impact against pre/post baseline windows...</p>
        </Card>
      ) : !isCompleted || !dataSufficient ? (
        <Card className="p-12 text-center mb-6">
          <Clock size={40} className="text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">
            Impact Evaluation: Insufficient Data
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
            {evaluation?.explanation ||
              `This action is currently ${action.status.replace('_', ' ')}. Rigorous evidence evaluation requires completed status and at least 2 post-completion feedback records within the evaluation window.`}
          </p>
        </Card>
      ) : (
        <>
          {/* Before/After comparison */}
          <div className="grid sm:grid-cols-2 gap-6 mb-6">
            <Card className="p-6">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Before Action Baseline</p>
              <p className="text-5xl font-bold text-red-600 dark:text-red-400 mb-2">{beforeNeg}%</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Negative Feedback Rate</p>
              <div className="mt-4 h-2 rounded-full bg-red-200 dark:bg-red-900/30 overflow-hidden">
                <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min(100, beforeNeg)}%` }} />
              </div>
            </Card>
            <Card className="p-6">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">After Action Window</p>
              <p className="text-5xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">{afterNeg}%</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Negative Feedback Rate</p>
              <div className="mt-4 h-2 rounded-full bg-emerald-200 dark:bg-emerald-900/30 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, afterNeg)}%` }} />
              </div>
            </Card>
          </div>

          {/* Cautious Evidence Banner (No unsupported causation claim) */}
          <Card className="p-6 mb-6 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border-emerald-200 dark:border-emerald-800/50">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-emerald-500 flex items-center justify-center shadow-md">
                <TrendingUp size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                  {evalType === 'effective'
                    ? 'Evidence Suggests Action Was Effective'
                    : evalType === 'partially_effective'
                    ? 'Evidence Suggests Partial Effectiveness'
                    : 'Evidence Inconclusive'}
                </h3>
                <p className="text-sm text-emerald-600 dark:text-emerald-400">
                  {evaluation?.explanation ||
                    `Evidence indicates a ${improvement} percentage point reduction in negative student reports following implementation.`}
                </p>
              </div>
            </div>
          </Card>

          {/* Before/After comparison chart */}
          <Card className="p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Pre-Action vs Post-Action Observation Comparison</h3>
              <Badge variant="default">Verified Aggregate Windows</Badge>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.3} />
                <XAxis dataKey="window" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" domain={[0, 100]} />
                <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="negativePercent" name="Negative Sentiment %" fill="#ef4444" radius={[6, 6, 0, 0]} maxBarSize={70} />
                <Bar dataKey="positivePercent" name="Positive Sentiment %" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={70} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Additional metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-2"><TrendingDown size={16} className="text-emerald-500" /><span className="text-xs text-slate-400">Complaint Frequency</span></div>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {evaluation?.changes?.complaintReductionPct != null
                  ? `${evaluation.changes.complaintReductionPct > 0 ? '-' : '+'}${Math.abs(evaluation.changes.complaintReductionPct)}%`
                  : '—'}
              </p>
              <p className="text-xs text-slate-400 mt-1">Reduction in related complaint volume</p>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-2"><TrendingUp size={16} className="text-emerald-500" /><span className="text-xs text-slate-400">Rating Shift</span></div>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {evaluation?.changes?.ratingChange != null
                  ? `${evaluation.changes.ratingChange >= 0 ? '+' : ''}${evaluation.changes.ratingChange}★`
                  : '—'}
              </p>
              <p className="text-xs text-slate-400 mt-1">Average rating change</p>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-2"><CheckCircle size={16} className="text-emerald-500" /><span className="text-xs text-slate-400">Data Sufficiency</span></div>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {dataSufficient ? 'Sufficient' : 'Pending'}
              </p>
              <p className="text-xs text-slate-400 mt-1">{evaluation?.after?.window || 'Observation window'}</p>
            </Card>
          </div>
        </>
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
