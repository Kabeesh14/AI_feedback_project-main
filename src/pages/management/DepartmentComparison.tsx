import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Badge, Button } from '@/components/common/UI';
import { AIExplainer } from '@/components/common/AIExplainer';
import { getDepartmentMetrics } from '@/services/analyticsService';
import { Building2, Check, X, TrendingUp, TrendingDown, ChevronRight } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

import { OFFICIAL_DEPARTMENTS, type Department } from '@/types';

const departments: Department[] = OFFICIAL_DEPARTMENTS;

const deptColors: Record<string, string> = {
  'Information Technology': '#3b82f6',
  'Cyber Security': '#06b6d4',
  'Computer Science and Business Engineering': '#6366f1',
  'Biotechnology and Biomedical Engineering': '#ec4899',
  'Artificial Intelligence & Data Science': '#8b5cf6',
  'Computer Science & Engineering': '#10b981',
  'Electronics & Communication Engineering': '#f59e0b',
  'Mechanical Engineering': '#f97316',
  'Civil Engineering': '#ef4444',
};

export function DepartmentComparison() {
  const metrics = getDepartmentMetrics();
  const [selected, setSelected] = useState<string[]>([
    'Artificial Intelligence & Data Science',
    'Computer Science & Engineering',
    'Cyber Security',
  ]);
  const navigate = useNavigate();

  const toggleDept = (dept: string) => {
    setSelected(prev => prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]);
  };

  const selectedMetrics = metrics.filter(m => selected.includes(m.department));

  const satisfactionData = selectedMetrics.map(m => ({ department: m.department, satisfaction: m.satisfaction, negative: m.negativePercent }));
  const issueData = selectedMetrics.map(m => ({ department: m.department, issues: m.issueCount, resolutionRate: m.resolutionRate }));
  const radarData = ['Satisfaction', 'Resolution', 'Improvement', 'Positive'].map(metric => {
    const row: Record<string, number | string> = { metric };
    selectedMetrics.forEach(m => {
      if (metric === 'Satisfaction') row[m.department] = m.satisfaction;
      else if (metric === 'Resolution') row[m.department] = m.resolutionRate;
      else if (metric === 'Improvement') row[m.department] = m.improvementRate;
      else if (metric === 'Positive') row[m.department] = 100 - m.negativePercent;
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
          {/* Summary cards with all 7 comparison metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {selectedMetrics.map(dept => {
              const critCount = Math.max(1, Math.floor(dept.issueCount * 0.25));
              return (
                <Card key={dept.department} className="p-5" hover onClick={() => navigate('/management/issues')}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-xl flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: deptColors[dept.department] }}>
                        {dept.department.slice(0, 2)}
                      </div>
                      <h3 className="font-semibold text-slate-800 dark:text-slate-100">{dept.department}</h3>
                    </div>
                    <ChevronRight size={18} className="text-slate-300" />
                  </div>
                  <div className="grid grid-cols-3 gap-2.5 text-xs">
                    <div>
                      <p className="text-slate-400">Feedback Vol</p>
                      <p className="text-base font-bold text-blue-600 dark:text-blue-400">{dept.totalFeedback}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Positive %</p>
                      <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">{dept.satisfaction}%</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Negative %</p>
                      <p className="text-base font-bold text-red-600 dark:text-red-400">{dept.negativePercent}%</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Active Issues</p>
                      <p className="text-base font-bold text-amber-600 dark:text-amber-400">{dept.issueCount}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Critical Issues</p>
                      <p className="text-base font-bold text-red-600 dark:text-red-400">{critCount}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Resolution</p>
                      <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">{dept.resolutionRate}%</p>
                    </div>
                    <div className="col-span-3 pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-slate-400">Improvement Rate:</span>
                      <span className="font-bold text-violet-600 dark:text-violet-400">+{dept.improvementRate}%</span>
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
                  <th className="pb-3 font-semibold">Active Issues</th>
                  <th className="pb-3 font-semibold">Critical Issues</th>
                  <th className="pb-3 font-semibold">Resolution Rate</th>
                  <th className="pb-3 font-semibold">Improvement Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {selectedMetrics.map(dept => {
                  const critCount = Math.max(1, Math.floor(dept.issueCount * 0.25));
                  return (
                    <tr key={dept.department} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 font-medium text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: deptColors[dept.department] }} />
                        {dept.department}
                      </td>
                      <td className="py-3 font-semibold text-slate-700 dark:text-slate-200">{dept.totalFeedback}</td>
                      <td className="py-3 font-semibold text-emerald-600 dark:text-emerald-400">{dept.satisfaction}%</td>
                      <td className="py-3 font-semibold text-red-600 dark:text-red-400">{dept.negativePercent}%</td>
                      <td className="py-3 text-slate-700 dark:text-slate-200">{dept.issueCount}</td>
                      <td className="py-3 font-semibold text-red-600 dark:text-red-400">{critCount}</td>
                      <td className="py-3 text-blue-600 dark:text-blue-400">{dept.resolutionRate}%</td>
                      <td className="py-3 font-semibold text-violet-600 dark:text-violet-400">+{dept.improvementRate}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          {/* Charts */}
          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {/* Satisfaction comparison */}
            <Card className="p-5">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Satisfaction vs Negative Feedback</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={satisfactionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.3} />
                  <XAxis dataKey="department" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="satisfaction" name="Satisfaction %" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="negative" name="Negative %" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Issues vs Resolution */}
            <Card className="p-5">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Issue Count vs Resolution Rate</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={issueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.3} />
                  <XAxis dataKey="department" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="issues" name="Issue Count" fill="#f97316" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="resolutionRate" name="Resolution Rate %" fill="#3b82f6" radius={[4, 4, 0, 0]} />
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
                {selectedMetrics.map(m => (
                  <Radar key={m.department} name={m.department} dataKey={m.department} stroke={deptColors[m.department]} fill={deptColors[m.department]} fillOpacity={0.1} strokeWidth={2} />
                ))}
                <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </Card>

          {/* Improvement rates */}
          <Card className="p-5 mt-6">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Improvement Rate Trend</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={selectedMetrics.map(m => ({ department: m.department, improvement: m.improvementRate }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.3} />
                <XAxis dataKey="department" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
                <Line type="monotone" dataKey="improvement" name="Improvement Rate %" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}
    </div>
  );
}
