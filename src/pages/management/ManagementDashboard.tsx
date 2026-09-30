import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Badge, Button, SeverityBadge } from '@/components/common/UI';
import { AIExplainer, AIBadge } from '@/components/common/AIExplainer';
import { AnimatedCounter } from '@/components/common/AnimatedCounter';
import { getInstitutionStats, fetchInstitutionStats, fetchDepartmentComparison, fetchThemes } from '@/services/analyticsService';
import { getCriticalIssues, subscribeIssueChange } from '@/services/issueService';
import { getActionStats, subscribeActionChange, fetchActions } from '@/services/actionService';
import { subscribeFeedbackChange, fetchFeedback } from '@/services/feedbackService';
import { fetchForms, fetchFormParticipation } from '@/services/formService';
import { MessageSquare, TrendingUp, AlertTriangle, CheckSquare, Activity, Building2, ChevronRight, Radio, Brain, Zap, Building, ChevronDown, ClipboardList, Users, CheckCircle2, BarChart3, ArrowRight, Loader2 } from 'lucide-react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useAuth } from '@/context/AuthContext';
import { OFFICIAL_DEPARTMENTS, type Department } from '@/types';

interface SurveyOverviewItem {
  id: number;
  department: string;
  title: string;
  status: 'draft' | 'published' | 'closed';
  targeted: number;
  responded: number;
  participationRate: string;
  aiStatus: string;
  primaryArea: string;
  priority: string;
}

export function ManagementDashboard() {
  const navigate = useNavigate();
  const { user, setDepartment } = useAuth();
  const currentDept = user?.department || null;

  const [stats, setStats] = useState(() => getInstitutionStats(currentDept));
  const [deptMetrics, setDeptMetrics] = useState<any[]>([]);
  const [campusHealthAreas, setCampusHealthAreas] = useState<Array<{ area: string; score: number }>>([]);
  const [campusAreas, setCampusAreas] = useState<any[]>([]);
  const [criticalIssues, setCriticalIssues] = useState(() => getCriticalIssues(currentDept));
  const [actionStats, setActionStats] = useState(() => getActionStats(currentDept));

  // Phase 6B: Department Surveys & Institutional Participation state
  const [surveys, setSurveys] = useState<SurveyOverviewItem[]>([]);
  const [surveysLoading, setSurveysLoading] = useState<boolean>(true);
  const [surveysError, setSurveysError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadSurveyOverview() {
      try {
        setSurveysLoading(true);
        setSurveysError(null);
        const forms = await fetchForms({ department: currentDept || undefined });
        if (!mounted) return;

        if (!forms || forms.length === 0) {
          setSurveys([]);
          setSurveysLoading(false);
          return;
        }

        const items: SurveyOverviewItem[] = await Promise.all(
          forms.map(async (f) => {
            let targeted = 0;
            let responded = f.submission_count ?? 0;
            let participationRate = '0%';

            try {
              const pData = await fetchFormParticipation(f.id);
              if (pData?.stats) {
                targeted = pData.stats.targeted ?? 0;
                responded = pData.stats.responded ?? (f.submission_count ?? 0);
                participationRate = pData.stats.responseRateFormatted || (targeted > 0 ? `${((responded / targeted) * 100).toFixed(1)}%` : '0%');
              }
            } catch {
              targeted = 0;
            }

            return {
              id: f.id,
              department: f.department,
              title: f.title,
              status: f.status,
              targeted,
              responded,
              participationRate,
              aiStatus: f.ai_status || 'pending',
              primaryArea: f.ai_primary_area || '—',
              priority: f.ai_priority ? f.ai_priority.toUpperCase() : '—'
            };
          })
        );

        if (mounted) {
          setSurveys(items);
        }
      } catch (err: any) {
        if (mounted) {
          console.warn('[ManagementDashboard] Failed to load survey overview:', err);
          setSurveysError(err.message || 'Failed to load department surveys.');
          setSurveys([]);
        }
      } finally {
        if (mounted) setSurveysLoading(false);
      }
    }

    loadSurveyOverview();
    return () => { mounted = false; };
  }, [currentDept]);

  useEffect(() => {
    fetchFeedback({ department: currentDept }).catch(() => {});
    fetchActions(currentDept).catch(() => {});
    fetchDepartmentComparison().then(data => {
      const deptList = data?.departments || data?.matrix || (Array.isArray(data) ? data : []);
      if (Array.isArray(deptList) && deptList.length > 0) {
        const mapped = deptList.map((m: any) => ({
          department: m.department,
          satisfaction: Number(m.satisfactionScore ?? m.satisfaction ?? 0),
          negativePercent: Number(m.negativePercent ?? 0),
          issueCount: Number(m.activeIssuesCount ?? m.issueCount ?? 0),
          resolutionRate: Number(m.resolutionRate ?? 0),
          improvementRate: Number(m.improvementRate ?? 0),
          totalFeedback: Number(m.totalFeedback ?? 0),
        }));
        setDeptMetrics(mapped);
      }
    }).catch(() => {});

    fetchThemes(currentDept).then(themesData => {
      if (Array.isArray(themesData) && themesData.length > 0) {
        const mappedAreas = themesData.map(t => ({
          area: t.name || t.category,
          score: t.positivePercent || 0,
        }));
        setCampusHealthAreas(mappedAreas);
      } else {
        setCampusHealthAreas([]);
      }
    }).catch(() => {});

    fetchInstitutionStats(currentDept).then(live => {
      if (live) {
        const kpis = live.kpis || live;
        setStats(prev => ({
          ...prev,
          totalFeedbackToday: kpis.todayFeedback ?? kpis.totalFeedback ?? live.todayFeedback ?? prev.totalFeedbackToday,
          institutionSatisfaction: kpis.satisfactionRate ?? live.satisfactionScore ?? prev.institutionSatisfaction,
          activeIssues: kpis.activeIssues ?? live.activeIssuesCount ?? prev.activeIssues,
          criticalIssues: kpis.criticalIssues ?? live.criticalIssuesCount ?? prev.criticalIssues,
          actionsInProgress: kpis.actionsInProgress ?? live.actionsInProgressCount ?? prev.actionsInProgress,
        }));
        if (Array.isArray(live.topIssues) && live.topIssues.length > 0) {
          setCriticalIssues(live.topIssues);
        }
      }
    }).catch(() => {});
    setStats(getInstitutionStats(currentDept));
    setCriticalIssues(getCriticalIssues(currentDept));
    setActionStats(getActionStats(currentDept));
  }, [currentDept]);

  useEffect(() => {
    const unsub1 = subscribeFeedbackChange(() => {
      setStats(getInstitutionStats(currentDept));
    });
    const unsub2 = subscribeActionChange(() => {
      setStats(getInstitutionStats(currentDept));
      setActionStats(getActionStats(currentDept));
      setCriticalIssues(getCriticalIssues(currentDept));
    });
    const unsub3 = subscribeIssueChange(() => {
      setCriticalIssues(getCriticalIssues(currentDept));
    });
    return () => {
      unsub1(); unsub2(); unsub3();
    };
  }, [currentDept]);

  const publishedSurveys = surveys.filter(s => s.status === 'published');
  const activeSurveysCount = publishedSurveys.length;
  const totalTargeted = publishedSurveys.reduce((acc, s) => acc + s.targeted, 0);
  const totalResponded = publishedSurveys.reduce((acc, s) => acc + s.responded, 0);
  const overallParticipation = totalTargeted > 0
    ? `${((totalResponded / totalTargeted) * 100).toFixed(1)}%`
    : '0%';

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
        <Card className="p-5">
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
        <Card className="p-5" hover onClick={() => navigate('/management/issues')}>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-9 w-9 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
              <Zap size={18} className="text-red-600 dark:text-red-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400"><AnimatedCounter value={stats.criticalIssues} /></p>
          <p className="text-xs text-slate-400 mt-1">Critical Issues</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-9 w-9 rounded-xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center">
              <CheckSquare size={18} className="text-violet-600 dark:text-violet-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-800 dark:text-slate-100"><AnimatedCounter value={stats.actionsInProgress} /></p>
          <p className="text-xs text-slate-400 mt-1">Actions In Progress</p>
        </Card>
      </div>

      {/* Department Surveys & Participation (Phase 6B) */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <ClipboardList size={20} className="text-emerald-500" />
              Department Surveys & Feedback
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {currentDept ? `${currentDept} active surveys and response rates` : 'Institution-wide department surveys, student feedback, and collective intelligence'}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/management/feedback')}>
            View All Surveys <ChevronRight size={14} />
          </Button>
        </div>

        {/* Survey KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <Card className="p-4" hover onClick={() => navigate('/management/feedback')}>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                <ClipboardList size={16} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Active Surveys</span>
            </div>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {surveysLoading ? <span className="text-slate-400 text-lg">...</span> : activeSurveysCount}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Published department surveys</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <Users size={16} className="text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Survey Targets</span>
            </div>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {surveysLoading ? <span className="text-slate-400 text-lg">...</span> : totalTargeted}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Targeted student opportunities</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-8 w-8 rounded-lg bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center">
                <CheckCircle2 size={16} className="text-violet-600 dark:text-violet-400" />
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Responses</span>
            </div>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {surveysLoading ? <span className="text-slate-400 text-lg">...</span> : totalResponded}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Total submitted responses</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-8 w-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                <BarChart3 size={16} className="text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Overall Feedback Rate</span>
            </div>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {surveysLoading ? <span className="text-slate-400 text-lg">...</span> : overallParticipation}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Weighted response rate</p>
          </Card>
        </div>

        {/* Department Survey Status & Intelligence Table */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Department Survey Status & Intelligence</h3>
              <p className="text-xs text-slate-400 mt-0.5">Real-time status, engagement rosters, and collective AI indicators</p>
            </div>
          </div>

          {surveysLoading ? (
            <div className="py-8 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin text-blue-500" />
              Loading department survey intelligence...
            </div>
          ) : surveysError ? (
            <div className="py-6 text-center text-red-500 text-sm">{surveysError}</div>
          ) : surveys.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              No department surveys found {currentDept ? `for ${currentDept}` : 'across the institution'}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-3">Department</th>
                    <th className="py-3 px-3">Survey Title</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Targeted</th>
                    <th className="py-3 px-3 text-right">Responded</th>
                    <th className="py-3 px-3 text-right">Feedback %</th>
                    <th className="py-3 px-3">AI Status</th>
                    <th className="py-3 px-3">Primary Area</th>
                    <th className="py-3 px-3">Priority</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {surveys.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {s.department}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-700 dark:text-slate-300 max-w-[200px] truncate" title={s.title}>
                        {s.title}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <Badge variant={s.status === 'published' ? 'info' : s.status === 'closed' ? 'default' : 'warning'}>
                          {s.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-right font-mono">{s.targeted}</td>
                      <td className="py-3 px-3 text-right font-mono">{s.responded}</td>
                      <td className="py-3 px-3 text-right font-semibold whitespace-nowrap font-mono text-emerald-600 dark:text-emerald-400">
                        {s.participationRate}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <Badge variant={s.aiStatus === 'completed' ? 'success' : s.aiStatus === 'processing' ? 'info' : s.aiStatus === 'failed' ? 'critical' : 'default'}>
                          {s.aiStatus}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        {s.primaryArea}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {s.priority !== '—' ? (
                          <Badge variant={s.priority === 'CRITICAL' ? 'critical' : s.priority === 'HIGH' ? 'high' : s.priority === 'MEDIUM' ? 'medium' : 'low'}>
                            {s.priority}
                          </Badge>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/management/feedback/${s.id}?tab=analysis`)}
                          className="text-xs"
                        >
                          View Analysis <ArrowRight size={12} className="ml-1" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Campus Health Radar */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AIBadge>Campus Health</AIBadge>
            </div>
            <AIExplainer insightType="theme" />
          </div>
          {campusHealthAreas.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <RadarChart data={campusHealthAreas}>
                <PolarGrid stroke="#e2e8f0" strokeOpacity={0.3} />
                <PolarAngleAxis dataKey="area" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <Radar name="Score" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
                <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-sm">
              <p>No category health data recorded yet.</p>
            </div>
          )}
        </Card>

        {/* Campus areas */}
        <Card className="p-5">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Campus Areas</h3>
          <div className="space-y-2">
            {campusAreas.length > 0 ? (
              campusAreas.map(area => (
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
              ))
            ) : (
              <p className="text-sm text-slate-400 text-center py-6">Campus area mapping is not currently available.</p>
            )}
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
            {deptMetrics.length > 0 ? (
              deptMetrics.map(dept => (
                <div key={dept.department} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors" onClick={() => navigate('/management/departments')}>
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-100 to-violet-100 dark:from-blue-900/30 dark:to-violet-900/30 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400">
                    {(dept.department || '').slice(0, 2)}
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
              ))
            ) : (
              <p className="text-sm text-slate-400 text-center py-6">Loading department comparison...</p>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Critical Issues</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/management/issues')}>View All <ChevronRight size={14} /></Button>
          </div>
          <div className="space-y-2">
            {criticalIssues.length > 0 ? (
              criticalIssues.map(issue => (
                <div key={issue.id} className="flex items-center gap-3 p-3 rounded-xl bg-red-50/50 dark:bg-red-900/10 cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" onClick={() => navigate(`/management/issues/${issue.id}`)}>
                  <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{issue.title}</p>
                    <p className="text-xs text-slate-400">
                      {(issue.feedbackCount ?? issue.complaintCount ?? 0)} complaints{issue.negativePercent != null ? ` · ${issue.negativePercent}% negative` : (issue.category ? ` · ${issue.category}` : '')}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-slate-300" />
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400 text-center py-6">No critical issues detected.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
