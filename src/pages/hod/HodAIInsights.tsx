import { Card, Badge, Button, SeverityBadge } from '@/components/common/UI';
import { AIBadge, AIExplainer } from '@/components/common/AIExplainer';
import { generateDailySummary, generateRecommendations, identifyPossibleCauses } from '@/services/aiService';
import { getAllIssues } from '@/services/issueService';
import { getFeedbackStats, getSentimentTrend, getCategoryBreakdown } from '@/services/feedbackService';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Brain, TrendingUp, AlertTriangle, ChevronRight, GitBranch, Lightbulb } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';

import { useAuth } from '@/context/AuthContext';

export function HodAIInsights() {
  const { user } = useAuth();
  const currentDept = user?.department || 'Artificial Intelligence & Data Science';
  const summary = generateDailySummary(currentDept);
  const recommendations = generateRecommendations(currentDept);
  const issues = getAllIssues(currentDept);
  const stats = getFeedbackStats(currentDept);
  const trend = getSentimentTrend(7, currentDept);
  const breakdown = getCategoryBreakdown(currentDept);

  const radarData = breakdown.slice(0, 8).map(b => ({ category: b.category, positive: b.positive, negative: b.negative }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <AIBadge>AI Insights</AIBadge>
            <span className="text-xs text-slate-400">Demo Data</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">AI Intelligence Insights</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Automated analysis of today's department feedback patterns</p>
        </div>
        <AIExplainer insightType="theme" />
      </div>

      {/* Daily summary */}
      <Card className="p-6 mb-6 bg-gradient-to-br from-violet-50 to-blue-50 dark:from-violet-900/20 dark:to-blue-900/20 border-violet-200 dark:border-violet-800/50">
        <div className="flex items-center gap-2 mb-4">
          <Brain size={20} className="text-violet-500" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">AI Daily Summary</h3>
          <AIBadge>Auto-generated</AIBadge>
        </div>
        <p className="text-sm text-slate-700 dark:text-slate-200 mb-4">
          Today, <strong>{summary.totalResponses}</strong> feedback responses were analyzed. Overall sentiment is <strong className="text-emerald-600 dark:text-emerald-400">{summary.positivePercent}% positive</strong> with <strong className="text-red-600 dark:text-red-400">{summary.negativePercent}% negative</strong>. <strong>{summary.newIssues}</strong> emerging issues were detected and <strong>{summary.criticalAlerts}</strong> critical alerts were generated.
        </p>
        <div>
          <p className="text-xs text-slate-400 mb-2">Top concerns identified:</p>
          <div className="space-y-2">
            {summary.topConcerns.map((concern, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-800/50">
                <span className="h-6 w-6 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-xs font-bold text-violet-600 dark:text-violet-400">{i + 1}</span>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 flex-1">{concern.issue}</span>
                <Badge variant="negative">{concern.percent}% of negative</Badge>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Category radar */}
        <Card className="p-5">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Category Sentiment Radar</h3>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e2e8f0" strokeOpacity={0.3} />
              <PolarAngleAxis dataKey="category" tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <PolarRadiusAxis tick={{ fontSize: 9 }} stroke="#94a3b8" />
              <Radar name="Positive" dataKey="positive" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
              <Radar name="Negative" dataKey="negative" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
              <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>

        {/* Category volume */}
        <Card className="p-5">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Feedback Volume by Category</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={breakdown} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.3} />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis type="category" dataKey="category" tick={{ fontSize: 10 }} stroke="#94a3b8" width={80} />
              <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} />
              <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Recommendations */}
      <Card className="p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb size={18} className="text-amber-500" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">AI Recommendations</h3>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {recommendations.map((rec, i) => (
            <div key={i} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-start gap-2 mb-2">
                <Sparkles size={16} className="text-violet-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-slate-700 dark:text-slate-200">{rec}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Issue priority analysis */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">Issue Priority Analysis</h3>
          <AIExplainer insightType="priority" />
        </div>
        <div className="space-y-3">
          {issues.slice(0, 5).map(issue => {
            const causes = identifyPossibleCauses(issue.title);
            return (
              <div key={issue.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all cursor-pointer" onClick={() => {}}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={issue.severity} />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{issue.title}</span>
                  </div>
                  <span className="text-xs text-slate-400">Priority: {issue.priorityScore}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span>{issue.complaintCount} complaints</span>
                  <span>{issue.negativePercent}% negative</span>
                  <span>{issue.affectedYears.length} years affected</span>
                </div>
                <div className="mt-2 flex items-center gap-1 flex-wrap">
                  <GitBranch size={12} className="text-rose-400" />
                  {causes.slice(0, 3).map((cause, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400">{cause}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
