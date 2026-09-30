import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Badge, Button } from '@/components/common/UI';
import { AIExplainer } from '@/components/common/AIExplainer';
import { fetchDepartmentComparison } from '@/services/analyticsService';
import { Building2, Check, X, ChevronRight } from 'lucide-react';
import { BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

import { OFFICIAL_DEPARTMENTS, type Department } from '@/types';

const departments: Department[] = OFFICIAL_DEPARTMENTS;

const deptColors: Record<string, string> = {
  'Information Technology': '#3b82f6',
  'IT': '#3b82f6',
  'Computer Science and Business System': '#8b5cf6',
  'CSBS': '#8b5cf6',
  'Biotechnology Engineering': '#ec4899',
  'Biotechnology': '#ec4899',
  'Biomedical Engineering': '#84cc16',
  'Biomedical': '#84cc16',
  'Artificial Intelligence & Data Science': '#10b981',
  'Artificial Intelligence and Data Science': '#10b981',
  'AIDS': '#10b981',
  'Computer Science & Engineering': '#6366f1',
  'Computer Science Engineering': '#6366f1',
  'CSE': '#6366f1',
  'Electronics & Communication Engineering': '#f59e0b',
  'Electronics and Communication Engineering': '#f59e0b',
  'ECE': '#f59e0b',
  'Mechanical Engineering': '#f97316',
  'Mech': '#f97316',
  'Civil Engineering': '#ef4444',
  'Civil': '#ef4444',
  'Computer Communication Engineering': '#06b6d4',
  'CCE': '#06b6d4',
  'Chemical Engineering': '#14b8a6',
  'Chemical': '#14b8a6',
  'Electrical and Electronics Engineering': '#eab308',
  'EEE': '#eab308',
  'Artificial Intelligence and Machine Learning': '#d946ef',
  'Artificial Intelligence & Machine Learning': '#d946ef',
  'AIML': '#d946ef',
};

const DEPT_CHART_LABELS: Record<string, string> = {
  'Artificial Intelligence and Machine Learning': 'AIML',
  'Artificial Intelligence & Machine Learning': 'AIML',
  'Computer Science and Business System': 'CSBS',
  'Computer Communication Engineering': 'CCE',
  'Chemical Engineering': 'Chemical',
  'Electrical and Electronics Engineering': 'EEE',
  'Biotechnology Engineering': 'Biotechnology',
  'Biotechnology': 'Biotechnology',
  'Biomedical Engineering': 'Biomedical',
  'Biomedical': 'Biomedical',
  'Artificial Intelligence and Data Science': 'AIDS',
  'Artificial Intelligence & Data Science': 'AIDS',
  'Computer Science Engineering': 'CSE',
  'Computer Science & Engineering': 'CSE',
  'Information Technology': 'IT',
  'Mechanical Engineering': 'Mech',
  'Civil Engineering': 'Civil',
  'Electronics and Communication Engineering': 'ECE',
  'Electronics & Communication Engineering': 'ECE',
};

function getChartDeptName(dept: string): string {
  if (!dept) return '';
  const trimmed = dept.trim();
  return DEPT_CHART_LABELS[trimmed] || trimmed;
}

export function DepartmentComparison() {
  const [metrics, setMetrics] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([
    'Artificial Intelligence & Data Science',
    'Computer Science & Engineering',
    'Information Technology',
  ]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDepartmentComparison().then(data => {
      const deptList = data?.departments || data?.matrix || (Array.isArray(data) ? data : []);
      if (Array.isArray(deptList) && deptList.length > 0) {
        const mapped = deptList.map((m: any) => ({
          department: m.department,
          satisfaction: Number(m.satisfactionScore ?? m.satisfaction ?? 0),
          negativePercent: Number(m.negativePercent ?? 0),
          issueCount: Number(m.activeIssuesCount ?? m.issueCount ?? 0),
          criticalCount: m.criticalCount != null ? Number(m.criticalCount) : (m.criticalIssuesCount != null ? Number(m.criticalIssuesCount) : null),
          resolutionRate: Number(m.resolutionRate ?? 0),
          improvementRate: Number(m.improvementRate ?? 0),
          totalFeedback: Number(m.totalFeedback ?? m.totalForms ?? 0),
          studentPositivePct: Number(m.studentPositivePct ?? m.satisfaction ?? 0),
          studentNegativePct: Number(m.studentNegativePct ?? m.negativePercent ?? 0),
          facultyPositivePct: Number(m.facultyPositivePct ?? 0),
          facultyNegativePct: Number(m.facultyNegativePct ?? 0),
        }));
        setMetrics(mapped);
      }
    }).catch(() => {});
  }, []);

  const toggleDept = (dept: string) => {
    setSelected(prev => prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]);
  };

  const selectedMetrics = metrics.filter(m => selected.includes(m.department));

  const studentFeedbackData = selectedMetrics.map(m => ({
    department: getChartDeptName(m.department),
    positive: m.studentPositivePct,
    negative: m.studentNegativePct
  }));

  const facultyFeedbackData = selectedMetrics.map(m => ({
    department: getChartDeptName(m.department),
    positive: m.facultyPositivePct,
    negative: m.facultyNegativePct
  }));

  const radarMetrics = [
    'Positive Feedback — Students',
    'Negative Feedback — Students',
    'Positive Feedback — Faculty',
    'Negative Feedback — Faculty'
  ];

  const radarData = radarMetrics.map(metric => {
    const row: Record<string, number | string> = { metric };
    selectedMetrics.forEach(m => {
      const shortName = getChartDeptName(m.department);
      if (metric === 'Positive Feedback — Students') row[shortName] = m.studentPositivePct;
      else if (metric === 'Negative Feedback — Students') row[shortName] = m.studentNegativePct;
      else if (metric === 'Positive Feedback — Faculty') row[shortName] = m.facultyPositivePct;
      else if (metric === 'Negative Feedback — Faculty') row[shortName] = m.facultyNegativePct;
    });
    return row;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Department Comparison</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Side-by-side analytics across all departments — select up to 5 to compare</p>
        </div>
        <AIExplainer insightType="theme" />
      </div>

      {/* Department selector */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {departments.map(dept => {
          const isSelected = selected.includes(dept);
          return (
            <button
              key={dept}
              onClick={() => toggleDept(dept)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                isSelected
                  ? 'text-white shadow-md'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
              style={isSelected ? { backgroundColor: deptColors[dept] } : {}}
            >
              {isSelected ? <Check size={14} /> : <X size={14} className="opacity-0" />}
              {dept}
            </button>
          );
        })}
      </div>

      {selected.length === 0 ? (
        <Card className="p-12 text-center">
          <Building2 size={40} className="text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Select at least one department to compare</p>
        </Card>
      ) : (
        <>
          {/* Summary cards with Feedback Volume, Positive Feedback %, and Negative Feedback % */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {selectedMetrics.map(dept => {
              return (
                <Card key={dept.department} className="p-5" hover onClick={() => navigate('/management/issues')}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-xl flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: deptColors[dept.department] }}>
                        {(dept.department || '').slice(0, 2)}
                      </div>
                      <h3 className="font-semibold text-slate-800 dark:text-slate-100">{dept.department}</h3>
                    </div>
                    <ChevronRight size={18} className="text-slate-300" />
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-xs pt-1">
                    <div>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] font-medium leading-tight">Feedback Volume</p>
                      <p className="text-base font-bold text-blue-600 dark:text-blue-400 mt-1">{dept.totalFeedback}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] font-medium leading-tight">Positive Feedback %</p>
                      <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1">{dept.satisfaction}%</p>
                    </div>
                    <div>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] font-medium leading-tight">Negative Feedback %</p>
                      <p className="text-base font-bold text-red-600 dark:text-red-400 mt-1">{dept.negativePercent}%</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Side-by-Side Comparison Table */}
          <Card className="p-5 mb-6 overflow-x-auto">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Strategic Department Comparison Matrix</h3>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400">
                  <th className="pb-3 font-semibold">Department</th>
                  <th className="pb-3 font-semibold">Feedback Vol</th>
                  <th className="pb-3 font-semibold">Positive %</th>
                  <th className="pb-3 font-semibold">Negative %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {selectedMetrics.map(dept => {
                  return (
                    <tr key={dept.department} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 font-medium text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: deptColors[dept.department] }} />
                        {dept.department}
                      </td>
                      <td className="py-3 font-semibold text-slate-700 dark:text-slate-200">{dept.totalFeedback}</td>
                      <td className="py-3 font-semibold text-emerald-600 dark:text-emerald-400">{dept.satisfaction}%</td>
                      <td className="py-3 font-semibold text-red-600 dark:text-red-400">{dept.negativePercent}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          {/* Charts */}
          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {/* Positive vs Negative Feedback — Students */}
            <Card className="p-5">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Positive vs Negative Feedback — Students</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={studentFeedbackData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.3} />
                  <XAxis dataKey="department" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" domain={[0, 100]} />
                  <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="positive" name="Positive %" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="negative" name="Negative %" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Positive vs Negative Feedback — Faculty */}
            <Card className="p-5">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Positive vs Negative Feedback — Faculty</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={facultyFeedbackData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.3} />
                  <XAxis dataKey="department" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" domain={[0, 100]} />
                  <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="positive" name="Positive %" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="negative" name="Negative %" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Radar comparison */}
          <Card className="p-5">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Multi-Metric Radar Comparison</h3>
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e2e8f0" strokeOpacity={0.3} />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="#94a3b8" />
                {selectedMetrics.map(m => {
                  const shortName = getChartDeptName(m.department);
                  return (
                    <Radar key={m.department} name={shortName} dataKey={shortName} stroke={deptColors[m.department]} fill={deptColors[m.department]} fillOpacity={0.1} strokeWidth={2} />
                  );
                })}
                <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}
    </div>
  );
}
