import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Badge, SeverityBadge, EmptyState, Button } from '@/components/common/UI';
import { AIExplainer } from '@/components/common/AIExplainer';
import { fetchIssues, subscribeIssueChange } from '@/services/issueService';
import { AlertTriangle, ChevronRight, Users, MapPin, Filter, Building2, ChevronDown, Check } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { OFFICIAL_DEPARTMENTS, type Role, type Severity, type Issue } from '@/types';
import { useAuth } from '@/context/AuthContext';

const severityOrder: Severity[] = ['critical', 'high', 'medium', 'low'];

const severityConfig: Record<Severity, { label: string; color: string; bg: string; border: string }> = {
  critical: { label: 'Critical', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800/50' },
  high: { label: 'High', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800/50' },
  medium: { label: 'Medium', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800/50' },
  low: { label: 'Low', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800/50' },
};

export function IssueExplorer({ role }: { role: Role }) {
  const { user } = useAuth();
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [deptMenuOpen, setDeptMenuOpen] = useState(false);
  const effectiveDept = role === 'management' ? selectedDepartment : (user?.department || null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Severity | 'all'>('all');
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetchIssues(effectiveDept, { role })
      .then(data => {
        if (isMounted) {
          setIssues(data);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error('Failed to load issues:', err);
        if (isMounted) {
          setIssues([]);
          setLoading(false);
        }
      });

    const unsub = subscribeIssueChange(updatedIssues => {
      if (isMounted) {
        if (effectiveDept) {
          setIssues(updatedIssues.filter(i => i.department === effectiveDept));
        } else {
          setIssues(updatedIssues);
        }
      }
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, [effectiveDept]);

  const filtered = filter === 'all' ? issues : issues.filter(i => i.severity === filter);

  const grouped: Record<Severity, Issue[]> = {
    critical: issues.filter(i => i.severity === 'critical'),
    high: issues.filter(i => i.severity === 'high'),
    medium: issues.filter(i => i.severity === 'medium'),
    low: issues.filter(i => i.severity === 'low'),
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Issue Explorer</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            AI-detected issues organized by priority and severity {effectiveDept ? `· ${effectiveDept}` : '· Institution-wide'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {role === 'management' && (
            <div className="relative">
              <button
                type="button"
                id="department-categories-btn"
                onClick={() => setDeptMenuOpen(!deptMenuOpen)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100 transition-all shadow-sm active:scale-95"
              >
                <Building2 size={15} className="text-cyan-500 dark:text-cyan-400" />
                <span>Department Categories</span>
                {selectedDepartment ? (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 border border-cyan-500/20 max-w-[140px] truncate">
                    {selectedDepartment}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                    All Departments
                  </span>
                )}
                <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${deptMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {deptMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setDeptMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-72 max-h-80 overflow-y-auto z-50 bg-white dark:bg-[#0c0d18]/95 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-1.5 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-white/10 mb-1">
                      Department Categories
                    </div>
                    <button
                      type="button"
                      onClick={() => { setSelectedDepartment(null); setDeptMenuOpen(false); }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors flex items-center justify-between ${
                        selectedDepartment === null
                          ? 'bg-blue-50 dark:bg-cyan-500/10 text-blue-600 dark:text-cyan-300 font-semibold'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5'
                      }`}
                    >
                      <span>All Departments (Institution-wide)</span>
                      {selectedDepartment === null && <Check size={14} className="text-cyan-400" />}
                    </button>
                    {OFFICIAL_DEPARTMENTS.map(dept => (
                      <button
                        type="button"
                        key={dept}
                        onClick={() => { setSelectedDepartment(dept); setDeptMenuOpen(false); }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors flex items-center justify-between ${
                          selectedDepartment === dept
                            ? 'bg-blue-50 dark:bg-cyan-500/10 text-blue-600 dark:text-cyan-300 font-semibold'
                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5'
                        }`}
                      >
                        <span className="truncate">{dept}</span>
                        {selectedDepartment === dept && <Check size={14} className="text-cyan-400 flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          <AIExplainer insightType="priority" />
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        <Filter size={16} className="text-slate-400 flex-shrink-0" />
        <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${filter === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}>All Issues ({issues.length})</button>
        {severityOrder.map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${filter === s ? 'bg-blue-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}>
            {severityConfig[s].label} ({grouped[s].length})
          </button>
        ))}
      </div>

      {loading ? (
        <Card className="p-12 text-center text-slate-400">
          Loading issue intelligence...
        </Card>
      ) : issues.length === 0 ? (
        <EmptyState
          icon={<AlertTriangle size={48} />}
          title="No issues found"
          message="There are currently no recorded issues for this department scope."
        />
      ) : filter === 'all' ? (
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
  const cfg = severityConfig[issue.severity] || severityConfig.medium;
  const trendData = (Array.isArray(issue.trend) ? issue.trend : []).map((v, i) => ({ day: `D${i + 1}`, count: v }));
  const affectedYears = Array.isArray(issue.affectedYears) ? issue.affectedYears : [];
  const affectedLocations = Array.isArray(issue.affectedLocations) ? issue.affectedLocations : [];

  return (
    <Card hover onClick={() => navigate(`/${role}/issues/${issue.id}`)} className={`p-5 border-l-4 ${cfg.border}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <SeverityBadge severity={issue.severity} />
          <Badge variant="default">{issue.category}</Badge>
          {issue.department && issue.department !== 'ALL' && issue.department !== 'All Departments' && (
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 border border-cyan-500/20 max-w-[170px] truncate">
              {issue.department}
            </span>
          )}
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
          <span className="font-medium text-slate-700 dark:text-slate-200">{affectedYears.length > 0 ? affectedYears.length : 'All'}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <MapPin size={14} className="text-slate-400" />
          <span className="text-slate-400">Locations:</span>
          <span className="font-medium text-slate-700 dark:text-slate-200">{affectedLocations.length > 0 ? affectedLocations.length : '—'}</span>
        </div>
      </div>

      <div className="h-12">
        {trendData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <Line type="monotone" dataKey="count" stroke={issue.severity === 'critical' ? '#ef4444' : issue.severity === 'high' ? '#f97316' : issue.severity === 'medium' ? '#f59e0b' : '#3b82f6'} strokeWidth={2} dot={false} />
              <XAxis dataKey="day" hide />
              <YAxis hide />
              <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '11px' }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-xs text-slate-400">Trend unavailable</div>
        )}
      </div>
    </Card>
  );
}
