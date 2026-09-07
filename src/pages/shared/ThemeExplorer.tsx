import { useState } from 'react';
import { Card, Badge, SeverityBadge, EmptyState, Button } from '@/components/common/UI';
import { AIExplainer } from '@/components/common/AIExplainer';
import { getAllThemes } from '@/services/analyticsService';
import { getAllFeedback, getCategoryBreakdown } from '@/services/feedbackService';
import { useNavigate } from 'react-router-dom';
import { Layers, TrendingUp, TrendingDown, Minus, MessageSquare, Filter, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { Role } from '@/types';

import { useAuth } from '@/context/AuthContext';

export function ThemeExplorer({ role, department }: { role: Role; department?: string }) {
  const { user } = useAuth();
  const effectiveDept = role === 'hod' ? user?.department : (department || user?.department || undefined);
  const themes = getAllThemes(effectiveDept);
  const navigate = useNavigate();
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const allFeedback = getAllFeedback(effectiveDept);
  const filtered = selectedTheme ? allFeedback.filter(f => f.category === selectedTheme) : allFeedback;
  const breakdown = getCategoryBreakdown(effectiveDept);

  const getTrendIcon = (trend: number[]) => {
    if (trend.length < 2) return <Minus size={14} className="text-slate-400" />;
    const last = trend[trend.length - 1];
    const prev = trend[trend.length - 2];
    if (last > prev) return <TrendingUp size={14} className="text-red-500" />;
    if (last < prev) return <TrendingDown size={14} className="text-emerald-500" />;
    return <Minus size={14} className="text-slate-400" />;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Theme Explorer</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Interactive analysis of feedback themes across {effectiveDept || 'the institution'}
          </p>
        </div>
        <AIExplainer insightType="theme" />
      </div>

      {/* Theme cards */}
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
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
              <SeverityBadge severity={theme.priority} />
            </div>
          </Card>
        ))}
      </div>

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
