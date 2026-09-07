import { useState } from 'react';
import { Card, Badge, SentimentBadge, StatusBadge, EmptyState, Button } from '@/components/common/UI';
import { Drawer } from '@/components/common/Modal';
import { getAllFeedback, getFeedbackStats, getSentimentTrend, getCategoryBreakdown } from '@/services/feedbackService';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Filter, X, Search, Download } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { OFFICIAL_DEPARTMENTS, type Role, type Feedback, type Sentiment, type FeedbackStatus } from '@/types';
import { useAuth } from '@/context/AuthContext';

const sentimentColors: Record<Sentiment, string> = {
  positive: '#10b981',
  negative: '#ef4444',
  neutral: '#94a3b8',
};

export function FeedbackPage({ role, department }: { role: Role; department?: string }) {
  const { user } = useAuth();
  const hodDept = user?.department || 'Artificial Intelligence & Data Science';
  const initialDept = role === 'hod' ? hodDept : (department || user?.department || 'all');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>(initialDept);
  const [selected, setSelected] = useState<Feedback | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const navigate = useNavigate();

  // If HOD, strictly enforce their department only
  const activeDept = role === 'hod' ? hodDept : (selectedDeptFilter !== 'all' ? selectedDeptFilter : undefined);

  const allFeedback = getAllFeedback();
  const baseFeedback = role === 'hod'
    ? allFeedback.filter(f => f.department === hodDept)
    : (selectedDeptFilter !== 'all' ? allFeedback.filter(f => f.department === selectedDeptFilter) : allFeedback);

  let filtered = baseFeedback;
  if (searchQuery) {
    const l = searchQuery.toLowerCase();
    filtered = filtered.filter(f => f.comment.toLowerCase().includes(l) || f.category.toLowerCase().includes(l) || f.issue.toLowerCase().includes(l) || f.department.toLowerCase().includes(l));
  }
  if (sentimentFilter !== 'all') filtered = filtered.filter(f => f.sentiment === sentimentFilter);
  if (statusFilter !== 'all') filtered = filtered.filter(f => f.status === statusFilter);
  if (categoryFilter !== 'all') filtered = filtered.filter(f => f.category === categoryFilter);

  const categories = ['Teaching', 'Laboratory', 'Internet', 'Infrastructure', 'Hostel', 'Canteen', 'Transport', 'Placement', 'Library', 'Examination'];
  const statuses: FeedbackStatus[] = ['received', 'under_review', 'action_planned', 'in_progress', 'resolved'];

  const stats = getFeedbackStats(activeDept);
  const trend = getSentimentTrend(7, activeDept);

  const pieData = [
    { name: 'Positive', value: stats.positive, color: sentimentColors.positive },
    { name: 'Negative', value: stats.negative, color: sentimentColors.negative },
    { name: 'Neutral', value: stats.neutral, color: sentimentColors.neutral },
  ];

  const clearFilters = () => {
    setSearchQuery('');
    setSentimentFilter('all');
    setStatusFilter('all');
    setCategoryFilter('all');
    setSelectedDeptFilter(role === 'hod' ? hodDept : 'all');
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Feedback Stream</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {selectedDeptFilter !== 'all' ? `${selectedDeptFilter} department feedback` : 'All institutional feedback'} · {filtered.length} matching responses
        </p>
      </div>

      {/* Stats + Charts */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <Card className="p-5">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Sentiment Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3}>
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5 lg:col-span-2">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">7-Day Sentiment Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="posGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                <linearGradient id="negGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.3} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
              <Area type="monotone" dataKey="positive" stroke="#10b981" fill="url(#posGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="negative" stroke="#ef4444" fill="url(#negGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search feedback..." className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          {role === 'hod' ? (
            <div className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center whitespace-nowrap">
              <span>Department: {hodDept}</span>
            </div>
          ) : (
            <select value={selectedDeptFilter} onChange={e => setSelectedDeptFilter(e.target.value)} className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-200 text-sm focus:outline-none">
              <option value="all">All Departments</option>
              {OFFICIAL_DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          )}
          <select value={sentimentFilter} onChange={e => setSentimentFilter(e.target.value)} className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-200 text-sm focus:outline-none">
            <option value="all">All Sentiments</option>
            <option value="positive">Positive</option>
            <option value="negative">Negative</option>
            <option value="neutral">Neutral</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-200 text-sm focus:outline-none">
            <option value="all">All Statuses</option>
            {statuses.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-200 text-sm focus:outline-none">
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </Card>

      {/* Feedback list */}
      {filtered.length === 0 ? (
        <EmptyState icon={<MessageSquare size={48} />} title="No feedback matches the selected filters" message="Try adjusting or clearing your filters to see more results." actionLabel="Clear Filters" onAction={clearFilters} />
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-slate-400 mb-2">{filtered.length} results</p>
          {filtered.slice(0, 50).map(fb => (
            <Card key={fb.id} className="p-4 cursor-pointer" hover onClick={() => setSelected(fb)}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant="default">{fb.category}</Badge>
                    <SentimentBadge sentiment={fb.sentiment} />
                    {fb.anonymous && <Badge variant="ai">Anonymous</Badge>}
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-200 mb-1">{fb.comment}</p>
                  <p className="text-xs text-slate-400">{fb.department} · {fb.year} · {new Date(fb.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                </div>
                <StatusBadge status={fb.status} />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Details drawer */}
      <Drawer open={!!selected} onClose={() => setSelected(null)} title="Feedback Details">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="default">{selected.category}</Badge>
              <SentimentBadge sentiment={selected.sentiment} />
              <StatusBadge status={selected.status} />
              {selected.anonymous && <Badge variant="ai">Anonymous</Badge>}
            </div>
            <div><p className="text-xs text-slate-400 mb-1">Comment</p><p className="text-sm text-slate-700 dark:text-slate-200">{selected.comment}</p></div>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-slate-400 mb-1">Department</p><p className="text-sm font-medium text-slate-700 dark:text-slate-200">{selected.department}</p></div>
              <div><p className="text-xs text-slate-400 mb-1">Year</p><p className="text-sm font-medium text-slate-700 dark:text-slate-200">{selected.year}</p></div>
              <div><p className="text-xs text-slate-400 mb-1">Date</p><p className="text-sm font-medium text-slate-700 dark:text-slate-200">{new Date(selected.date).toLocaleDateString()}</p></div>
              <div><p className="text-xs text-slate-400 mb-1">AI Issue</p><p className="text-sm font-medium text-slate-700 dark:text-slate-200">{selected.issue}</p></div>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate(`/${role}/issues`)}>View Related Issue</Button>
          </div>
        )}
      </Drawer>
    </div>
  );
}
