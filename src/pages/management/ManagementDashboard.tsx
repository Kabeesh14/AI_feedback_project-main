import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Badge, Button, SeverityBadge } from '@/components/common/UI';
import { AIExplainer, AIBadge } from '@/components/common/AIExplainer';
import { AnimatedCounter } from '@/components/common/AnimatedCounter';
import { getInstitutionStats, getDepartmentMetrics, getCampusAreas } from '@/services/analyticsService';
import { getCriticalIssues, subscribeIssueChange } from '@/services/issueService';
import { getActionStats, subscribeActionChange } from '@/services/actionService';
import { subscribeFeedbackChange } from '@/services/feedbackService';
import { MessageSquare, TrendingUp, AlertTriangle, CheckSquare, Activity, Building2, ChevronRight, Radio, Brain, Zap, Building, ChevronDown } from 'lucide-react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useAuth } from '@/context/AuthContext';
import { OFFICIAL_DEPARTMENTS, type Department } from '@/types';

const campusHealthAreas = [
  { area: 'Teaching', score: 85 },
  { area: 'Infrastructure', score: 72 },
  { area: 'Student Services', score: 78 },
  { area: 'Labs', score: 65 },
  { area: 'Placement', score: 70 },
  { area: 'Hostel', score: 58 },
  { area: 'Transport', score: 75 },
];

export function ManagementDashboard() {
  const navigate = useNavigate();
  const { user, setDepartment } = useAuth();
  const currentDept = user?.department || null;

  const [stats, setStats] = useState(() => getInstitutionStats(currentDept));
  const [deptMetrics, setDeptMetrics] = useState(() => getDepartmentMetrics());
  const [campusAreas, setCampusAreas] = useState(() => getCampusAreas());
  const [criticalIssues, setCriticalIssues] = useState(() => getCriticalIssues(currentDept));
  const [actionStats, setActionStats] = useState(() => getActionStats(currentDept));

  useEffect(() => {
    setStats(getInstitutionStats(currentDept));
    setCriticalIssues(getCriticalIssues(currentDept));
    setActionStats(getActionStats(currentDept));
  }, [currentDept]);

  useEffect(() => {
    const unsub1 = subscribeFeedbackChange(() => {
      setStats(getInstitutionStats(currentDept));
      setDeptMetrics(getDepartmentMetrics());
      setCampusAreas(getCampusAreas());
    });
    const unsub2 = subscribeActionChange(() => {
      setStats(getInstitutionStats(currentDept));
      setActionStats(getActionStats(currentDept));
      setCriticalIssues(getCriticalIssues(currentDept));
      setDeptMetrics(getDepartmentMetrics());
    });
    const unsub3 = subscribeIssueChange(() => {
      setCriticalIssues(getCriticalIssues(currentDept));
    });
    return () => {
      unsub1(); unsub2(); unsub3();
    };
  }, [currentDept]);

  return (
    <div>
      {/* Header with Role + Department scope indicator and Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              Management · {currentDept ? `${currentDept} Analytics` : 'Institution-wide Intelligence'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {currentDept ? `${currentDept} Department Analytics` : 'Welcome to your Institutional Intelligence Center'}
          </h1>
        </div>

        {/* Management Department Switcher */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Building size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={currentDept || ''}
              onChange={e => {
                const val = e.target.value;
                setDepartment(val ? (val as Department) : null);
              }}
              className="pl-9 pr-8 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/20 shadow-sm appearance-none cursor-pointer"
            >
              <option value="">[ All Departments ▼ ]</option>
              {OFFICIAL_DEPARTMENTS.map(dept => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
          <AIExplainer insightType="priority" />
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card className="p-5" hover onClick={() => navigate('/management/feedback')}>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <MessageSquare size={18} className="text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-800 dark:text-slate-100"><AnimatedCounter value={stats.totalFeedbackToday} /></p>
          <p className="text-xs text-slate-400 mt-1">Feedback Today</p>
        </Card>
        <Card className="p-5" hover onClick={() => navigate('/management/pulse')}>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
              <TrendingUp size={18} className="text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400"><AnimatedCounter value={stats.institutionSatisfaction} suffix="%" /></p>
          <p className="text-xs text-slate-400 mt-1">Satisfaction</p>
        </Card>
        <Card className="p-5" hover onClick={() => navigate('/management/issues')}>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-9 w-9 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
              <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-800 dark:text-slate-100"><AnimatedCounter value={stats.activeIssues} /></p>
          <p className="text-xs text-slate-400 mt-1">Active Issues</p>
        </Card>
        <Card className="p-5" hover onClick={() => navigate('/management/alerts')}>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-9 w-9 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
              <Zap size={18} className="text-red-600 dark:text-red-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400"><AnimatedCounter value={stats.criticalIssues} /></p>
          <p className="text-xs text-slate-400 mt-1">Critical Issues</p>
        </Card>
        <Card className="p-5" hover onClick={() => navigate('/management/actions')}>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-9 w-9 rounded-xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center">
              <CheckSquare size={18} className="text-violet-600 dark:text-violet-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-800 dark:text-slate-100"><AnimatedCounter value={stats.actionsInProgress} /></p>
          <p className="text-xs text-slate-400 mt-1">Actions In Progress</p>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Campus Health Radar */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AIBadge>Campus Health</AIBadge>
              <span className="text-xs text-slate-400">Demo Data</span>
            </div>
            <AIExplainer insightType="theme" />
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart data={campusHealthAreas}>
              <PolarGrid stroke="#e2e8f0" strokeOpacity={0.3} />
              <PolarAngleAxis dataKey="area" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <Radar name="Score" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
              <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>

        {/* Campus areas */}
        <Card className="p-5">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Campus Areas</h3>
          <div className="space-y-2">
            {campusAreas.map(area => (
              <div key={area.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors" onClick={() => navigate('/management/issues')}>
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  area.severity === 'critical' ? 'bg-red-50 dark:bg-red-900/20' :
                  area.severity === 'high' ? 'bg-orange-50 dark:bg-orange-900/20' :
                  area.severity === 'medium' ? 'bg-amber-50 dark:bg-amber-900/20' :
                  'bg-blue-50 dark:bg-blue-900/20'
                }`}>
                  <Building2 size={14} className={
                    area.severity === 'critical' ? 'text-red-500' :
                    area.severity === 'high' ? 'text-orange-500' :
                    area.severity === 'medium' ? 'text-amber-500' :
                    'text-blue-500'
                  } />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{area.name}</p>
                  <p className="text-xs text-slate-400">{area.issueCount} issues · {area.feedbackCount} feedback</p>
                </div>
                <SeverityBadge severity={area.severity} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Department overview + Critical issues */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Department Overview</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/management/departments')}>Compare <ChevronRight size={14} /></Button>
          </div>
          <div className="space-y-3">
            {deptMetrics.map(dept => (
              <div key={dept.department} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors" onClick={() => navigate('/management/departments')}>
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-100 to-violet-100 dark:from-blue-900/30 dark:to-violet-900/30 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400">
                  {dept.department.slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{dept.department}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span>{dept.satisfaction}% sat</span>
                    <span>{dept.issueCount} issues</span>
                    <span>{dept.resolutionRate}% resolved</span>
                  </div>
                </div>
                <div className="w-16 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${dept.satisfaction}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Critical Issues</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/management/issues')}>View All <ChevronRight size={14} /></Button>
          </div>
          <div className="space-y-2">
            {criticalIssues.map(issue => (
              <div key={issue.id} className="flex items-center gap-3 p-3 rounded-xl bg-red-50/50 dark:bg-red-900/10 cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" onClick={() => navigate(`/management/issues/${issue.id}`)}>
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
    </div>
  );
}
