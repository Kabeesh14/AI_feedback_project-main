import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Badge, SeverityBadge, Button, EmptyState } from '@/components/common/UI';
import { AIExplainer, AIBadge } from '@/components/common/AIExplainer';
import { Drawer } from '@/components/common/Modal';
import { fetchIssues, fetchPossibleCauses, getPossibleCauses, getIssueById } from '@/services/issueService';
import { getAllFeedback, fetchFeedback } from '@/services/feedbackService';
import { ArrowLeft, AlertTriangle, Users, TrendingUp, MessageSquare, Tag, GitBranch, ChevronRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { Role, Feedback, Issue, PossibleCause } from '@/types';
import { useAuth } from '@/context/AuthContext';

export function IssueIntelligence({ role }: { role: Role }) {
  const { issueId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const effectiveDept = role === 'management' ? null : (user?.department || null);

  const [issue, setIssue] = useState<Issue | null>(() => (issueId ? getIssueById(issueId) || null : null));
  const [causes, setCauses] = useState<PossibleCause[]>([]);
  const [loading, setLoading] = useState(!issue);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    Promise.all([
      fetchIssues(effectiveDept),
      fetchPossibleCauses(effectiveDept),
      fetchFeedback({ department: effectiveDept }).catch(() => [])
    ])
      .then(([issuesList]) => {
        if (!isMounted) return;
        const found = issuesList.find(i => String(i.id) === String(issueId));
        setIssue(found || null);
        if (found) {
          const matchedCauses = getPossibleCauses(found.title) || getPossibleCauses(found.id) || [];
          setCauses(matchedCauses);
        } else {
          setCauses([]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load issue intelligence:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [issueId, effectiveDept]);

  if (loading) {
    return (
      <Card className="p-12 text-center text-slate-400">
        Loading issue intelligence...
      </Card>
    );
  }

  if (!issue) {
    return (
      <EmptyState
        icon={<AlertTriangle size={48} />}
        title="Issue not found"
        message="The issue you're looking for doesn't exist or has been removed."
        actionLabel="Back to Issues"
        onAction={() => navigate(`/${role}/issues`)}
      />
    );
  }

  const relatedFeedback = getAllFeedback(issue.department).filter(f => f.issue === issue.title).slice(0, 8);
  const trend = Array.isArray(issue.trend) ? issue.trend : [];
  const trendData = trend.map((v, i) => ({ day: `Day ${i + 1}`, mentions: v }));
  const cluster = Array.isArray(issue.cluster) ? issue.cluster : [];
  const keywords = Array.isArray(issue.keywords) ? issue.keywords : [];
  const affectedYears = Array.isArray(issue.affectedYears) ? issue.affectedYears : [];

  return (
    <div>
      {/* Back button */}
      <button onClick={() => navigate(`/${role}/issues`)} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors mb-4">
        <ArrowLeft size={16} />
        Back to Issues
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <SeverityBadge severity={issue.severity} />
            <Badge variant="default">{issue.category}</Badge>
            {issue.department && <Badge variant="default">{issue.department}</Badge>}
            <AIBadge>AI Analyzed</AIBadge>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{issue.title}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Issue Intelligence Report {issue.department ? `· ${issue.department}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <AIExplainer insightType="priority" issueId={issue.id} />
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare size={18} className="text-blue-500" />
            <span className="text-xs text-slate-400">Total Mentions</span>
          </div>
          <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{issue.complaintCount}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={18} className="text-red-500" />
            <span className="text-xs text-slate-400">Negative Sentiment</span>
          </div>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400">{issue.negativePercent}%</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <Users size={18} className="text-amber-500" />
            <span className="text-xs text-slate-400">Total Feedback</span>
          </div>
          <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{issue.complaintCount}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={18} className="text-violet-500" />
            <span className="text-xs text-slate-400">Priority Score</span>
          </div>
          <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{issue.priorityScore != null ? issue.priorityScore : '—'}</p>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* 7-Day Trend */}
        <Card className="p-5">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">7-Day Mention Trend</h3>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorMentions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.3} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                <Area type="monotone" dataKey="mentions" stroke="#3b82f6" fillOpacity={1} fill="url(#colorMentions)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex items-center justify-center text-xs text-slate-400">Trend data unavailable</div>
          )}
        </Card>

        {/* Top Keywords */}
        <Card className="p-5">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Top Keywords</h3>
          {keywords.length === 0 ? (
            <p className="text-sm text-slate-400 py-4">No keywords extracted yet.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {keywords.map((kw, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                  <Tag size={14} className="text-violet-500" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{kw}</span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700/50">
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-3">Affected Years</h4>
            <div className="flex flex-wrap gap-2">
              {affectedYears.length === 0 ? (
                <span className="text-xs text-slate-400">All Academic Years</span>
              ) : (
                affectedYears.map(y => <Badge key={y} variant="info">{y}</Badge>)
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Similar Feedback Cluster */}
      <Card className="p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">Similar Feedback Cluster</h3>
          <AIBadge>AI Clustered</AIBadge>
        </div>
        {cluster.length === 0 ? (
          <p className="text-sm text-slate-400 py-2">No similar feedback clusters available.</p>
        ) : (
          <div className="space-y-2">
            {cluster.map((c, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors cursor-pointer" onClick={() => {
                const fb = relatedFeedback[i] || relatedFeedback[0];
                if (fb) setSelectedFeedback(fb);
              }}>
                <MessageSquare size={16} className="text-slate-400 flex-shrink-0" />
                <p className="text-sm text-slate-700 dark:text-slate-200 flex-1">{c}</p>
                <ChevronRight size={16} className="text-slate-300" />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Root Cause Preview */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <GitBranch size={18} className="text-rose-500" />
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Possible Contributing Factors</h3>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {causes.length === 0 ? (
            <p className="text-sm text-slate-400 col-span-2 py-4 text-center">No contributing factors recorded for this issue.</p>
          ) : (
            causes.map(cause => (
              <div key={cause.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{cause.factor}</p>
                  <Badge variant={cause.confidence === 'high' ? 'positive' : cause.confidence === 'moderate' ? 'warning' : 'neutral'}>
                    {cause.confidence}
                  </Badge>
                </div>
                <p className="text-xs text-slate-400">{cause.relatedFeedbackCount} supporting responses</p>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Feedback detail drawer */}
      <Drawer open={!!selectedFeedback} onClose={() => setSelectedFeedback(null)} title="Feedback Detail">
        {selectedFeedback && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="default">{selectedFeedback.category}</Badge>
              <Badge variant={selectedFeedback.sentiment === 'positive' ? 'positive' : selectedFeedback.sentiment === 'negative' ? 'negative' : 'neutral'}>{selectedFeedback.sentiment}</Badge>
              {selectedFeedback.anonymous && <Badge variant="ai">Anonymous</Badge>}
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Comment</p>
              <p className="text-sm text-slate-700 dark:text-slate-200">{selectedFeedback.comment}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-slate-400 mb-1">Department</p><p className="text-sm font-medium text-slate-700 dark:text-slate-200">{selectedFeedback.department}</p></div>
              <div><p className="text-xs text-slate-400 mb-1">Year</p><p className="text-sm font-medium text-slate-700 dark:text-slate-200">{selectedFeedback.year}</p></div>
              <div><p className="text-xs text-slate-400 mb-1">Date</p><p className="text-sm font-medium text-slate-700 dark:text-slate-200">{new Date(selectedFeedback.date).toLocaleDateString()}</p></div>
              <div><p className="text-xs text-slate-400 mb-1">Severity</p><SeverityBadge severity={selectedFeedback.severity} /></div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
