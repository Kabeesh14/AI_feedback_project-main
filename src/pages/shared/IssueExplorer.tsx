import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Badge, SeverityBadge, EmptyState, Button } from '@/components/common/UI';
import { AIExplainer } from '@/components/common/AIExplainer';
import { getAllIssues } from '@/services/issueService';
import { AlertTriangle, ChevronRight, TrendingUp, Users, MapPin, Filter } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { Role, Severity, Issue } from '@/types';

const severityOrder: Severity[] = ['critical', 'high', 'medium', 'low'];

const severityConfig: Record<Severity, { label: string; color: string; bg: string; border: string }> = {
  critical: { label: 'Critical', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800/50' },
  high: { label: 'High', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800/50' },
  medium: { label: 'Medium', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800/50' },
  low: { label: 'Low', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800/50' },
};

import { useAuth } from '@/context/AuthContext';

export function IssueExplorer({ role }: { role: Role }) {
  const { user } = useAuth();
  const effectiveDept = role === 'hod' ? user?.department : (user?.department || undefined);
  const issues = getAllIssues(effectiveDept);
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Severity | 'all'>('all');

  const filtered = filter === 'all' ? issues : issues.filter(i => i.severity === filter);

  const grouped: Record<Severity, Issue[]> = {
    critical: issues.filter(i => i.severity === 'critical'),
    high: issues.filter(i => i.severity === 'high'),
    medium: issues.filter(i => i.severity === 'medium'),
    low: issues.filter(i => i.severity === 'low'),
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Issue Explorer</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            AI-detected issues organized by priority and severity {effectiveDept ? `· ${effectiveDept}` : '· Institution-wide'}
          </p>
        </div>
        <AIExplainer insightType="priority" />
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        <Filter size={16} className="text-slate-400 flex-shrink-0" />
        <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${filter === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}>All Issues</button>
        {severityOrder.map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${filter === s ? 'bg-blue-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}>
            {severityConfig[s].label} ({grouped[s].length})
          </button>
        ))}
      </div>

      {filter === 'all' ? (
        <div className="space-y-6">
          {severityOrder.map(severity => (
            grouped[severity].length > 0 && (
              <div key={severity}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`h-3 w-3 rounded-full ${severity === 'critical' ? 'bg-red-500' : severity === 'high' ? 'bg-orange-500' : severity === 'medium' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                  <h2 className={`text-sm font-semibold uppercase tracking-wider ${severityConfig[severity].color}`}>{severityConfig[severity].label}</h2>
                  <span className="text-xs text-slate-400">({grouped[severity].length} issues)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {grouped[severity].map(issue => <IssueCard key={issue.id} issue={issue} role={role} />)}
                </div>
              </div>
            )
          ))}
        </div>
      ) : (
        filtered.length === 0 ? (
          <EmptyState icon={<AlertTriangle size={48} />} title="No issues at this severity level" message="Try selecting a different severity filter." actionLabel="Clear Filters" onAction={() => setFilter('all')} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(issue => <IssueCard key={issue.id} issue={issue} role={role} />)}
          </div>
        )
      )}
    </div>
  );
}

function IssueCard({ issue, role }: { issue: Issue; role: Role }) {
  const navigate = useNavigate();
  const cfg = severityConfig[issue.severity];
  const trendData = issue.trend.map((v, i) => ({ day: `D${i + 1}`, count: v }));

  return (
    <Card hover onClick={() => navigate(`/${role}/issues/${issue.id}`)} className={`p-5 border-l-4 ${cfg.border}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <SeverityBadge severity={issue.severity} />
          <Badge variant="default">{issue.category}</Badge>
        </div>
        <ChevronRight size={18} className="text-slate-300" />
      </div>
      <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">{issue.title}</h3>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="flex items-center gap-1.5 text-xs">
          <AlertTriangle size={14} className="text-red-400" />
          <span className="text-slate-400">Complaints:</span>
          <span className="font-medium text-slate-700 dark:text-slate-200">{issue.complaintCount}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-400">Negative:</span>
          <span className="font-medium text-red-600 dark:text-red-400">{issue.negativePercent}%</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <Users size={14} className="text-slate-400" />
          <span className="text-slate-400">Years:</span>
          <span className="font-medium text-slate-700 dark:text-slate-200">{issue.affectedYears.length}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <MapPin size={14} className="text-slate-400" />
          <span className="text-slate-400">Locations:</span>
          <span className="font-medium text-slate-700 dark:text-slate-200">{issue.affectedLocations.length}</span>
        </div>
      </div>

      <div className="h-12">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trendData}>
            <Line type="monotone" dataKey="count" stroke={issue.severity === 'critical' ? '#ef4444' : issue.severity === 'high' ? '#f97316' : issue.severity === 'medium' ? '#f59e0b' : '#3b82f6'} strokeWidth={2} dot={false} />
            <XAxis dataKey="day" hide />
            <YAxis hide />
            <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '11px' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
