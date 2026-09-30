import { useState, useEffect } from 'react';
import { Card, Badge, SeverityBadge, EmptyState, Button } from '@/components/common/UI';
import { AIExplainer } from '@/components/common/AIExplainer';
import { fetchThemes } from '@/services/analyticsService';
import { fetchFeedback } from '@/services/feedbackService';
import { useNavigate } from 'react-router-dom';
import { Layers, TrendingUp, TrendingDown, Minus, MessageSquare, Filter, X, Building2, ChevronDown, Check } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { OFFICIAL_DEPARTMENTS, type Role, type Theme, type Feedback } from '@/types';

import { useAuth } from '@/context/AuthContext';

const categories = ['Teaching', 'Laboratory', 'Internet', 'Infrastructure', 'Hostel', 'Canteen', 'Transport', 'Placement', 'Library', 'Examination'];

export function ThemeExplorer({ role, department }: { role: Role; department?: string }) {
  const { user } = useAuth();
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(department || null);
  const [deptMenuOpen, setDeptMenuOpen] = useState(false);
  const effectiveDept = role === 'hod' ? user?.department : role === 'management' ? (selectedDepartment || undefined) : (department || user?.department || undefined);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [allFeedback, setAllFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([
      fetchThemes(effectiveDept),
      fetchFeedback({ department: effectiveDept, limit: 100 }).catch(() => [])
    ]).then(([themeData, feedbackData]) => {
      if (!mounted) return;
      setThemes(themeData || []);
      setAllFeedback(feedbackData || []);
      setLoading(false);
    }).catch(err => {
      console.warn('[ThemeExplorer] fetch failed:', err);
      if (mounted) setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [effectiveDept]);

  const filtered = selectedTheme ? allFeedback.filter(f => f.category === selectedTheme) : allFeedback;
  const breakdown = (themes.length > 0
    ? themes.map(t => ({
        category: t.name,
        positive: Math.round(((t.positivePercent || 0) / 100) * t.responses),
        neutral: Math.round((((100 - (t.positivePercent || 0) - (t.negativePercent || 0))) / 100) * t.responses),
        negative: Math.round(((t.negativePercent || 0) / 100) * t.responses),
        total: t.responses,
      }))
    : categories.map(cat => {
        const catItems = allFeedback.filter(f => f.category === cat);
        return {
          category: cat,
          positive: catItems.filter(f => f.sentiment === 'positive').length,
          neutral: catItems.filter(f => f.sentiment === 'neutral').length,
          negative: catItems.filter(f => f.sentiment === 'negative').length,
          total: catItems.length,
        };
      })
  ).filter(b => b.total > 0 || themes.length === 0);

  const getTrendIcon = (trend: number[]) => {
    if (!trend || trend.length < 2) return <Minus size={14} className="text-slate-400" />;
    const last = trend[trend.length - 1];
    const prev = trend[trend.length - 2];
    if (last > prev) return <TrendingUp size={14} className="text-red-500" />;
    if (last < prev) return <TrendingDown size={14} className="text-emerald-500" />;
    return <Minus size={14} className="text-slate-400" />;
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Theme Explorer</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Interactive analysis of feedback themes across {effectiveDept || 'the institution'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {role === 'management' && (
            <div className="relative">
              <button
                type="button"
                id="department-selection-btn"
                onClick={() => setDeptMenuOpen(!deptMenuOpen)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100 transition-all shadow-sm active:scale-95"
              >
                <Building2 size={15} className="text-cyan-500 dark:text-cyan-400" />
                <span>Department Selection</span>
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
                      Select Department
                    </div>
                    <button
                      type="button"
                      onClick={() => { setSelectedDepartment(null); setDeptMenuOpen(false); setSelectedTheme(null); }}
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
                        onClick={() => { setSelectedDepartment(dept); setDeptMenuOpen(false); setSelectedTheme(null); }}
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
          <AIExplainer insightType="theme" />
        </div>
      </div>

      {/* Theme cards */}
      {themes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
          {themes.map(theme => (
            <Card
              key={theme.name}
              hover
              onClick={() => { setSelectedTheme(selectedTheme === theme.name ? null : theme.name); }}
              className={`p-4 cursor-pointer transition-all ${selectedTheme === theme.name ? 'ring-2 ring-blue-500/30 shadow-lg' : ''}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-100 to-violet-100 dark:from-blue-900/30 dark:to-violet-900/30 flex items-center justify-center">
                  <Layers size={18} className="text-blue-600 dark:text-blue-400" />
                </div>
                {getTrendIcon(theme.trend)}
              </div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2">{theme.name}</h3>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Responses</span>
                  <span className="font-medium text-slate-700 dark:text-slate-200">{theme.responses}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-500">Positive</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">{theme.positivePercent}%</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-red-500">Negative</span>
                  <span className="font-medium text-red-600 dark:text-red-400">{theme.negativePercent}%</span>
                </div>
                {((theme as any).studentResponses != null || (theme as any).facultyResponses != null) && (
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-slate-100/60 dark:border-white/5">
                    <span>Students: {(theme as any).studentResponses || 0}</span>
                    <span>Faculty: {(theme as any).facultyResponses || 0}</span>
                  </div>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                <SeverityBadge severity={theme.priority} />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center text-slate-400 mb-6">
          {loading ? 'Loading theme analytics...' : 'No feedback themes recorded yet for this scope.'}
        </Card>
      )}

      {selectedTheme && (
        <Card className="p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Badge variant="default">{selectedTheme}</Badge>
              <span className="text-xs text-slate-400">{filtered.length} feedback items</span>
            </div>
            <button onClick={() => setSelectedTheme(null)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
              <X size={16} />
            </button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filtered.slice(0, 10).map(fb => (
              <div key={fb.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 dark:text-slate-200 truncate">{fb.comment}</p>
                  <p className="text-xs text-slate-400">{fb.department} · {new Date(fb.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                </div>
                <Badge variant={fb.sentiment === 'positive' ? 'positive' : fb.sentiment === 'negative' ? 'negative' : 'neutral'}>{fb.sentiment}</Badge>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate(`/${role}/feedback`)}>View All Feedback</Button>
        </Card>
      )}

      {/* Category breakdown chart */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">Feedback Volume by Category</h3>
          <button onClick={() => setShowBreakdown(!showBreakdown)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
            {showBreakdown ? 'Hide' : 'Show'} sentiment breakdown
          </button>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={breakdown}>
            <XAxis dataKey="category" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={60} stroke="#94a3b8" />
            <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
            <Tooltip
              contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
              cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
            />
            <Bar dataKey="positive" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
            {showBreakdown && <Bar dataKey="neutral" stackId="a" fill="#94a3b8" />}
            <Bar dataKey="negative" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
