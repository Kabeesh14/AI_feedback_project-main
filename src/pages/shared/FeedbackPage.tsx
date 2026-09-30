import { useState, useEffect } from 'react';
import { Card, Badge, SentimentBadge, StatusBadge, EmptyState, Button } from '@/components/common/UI';
import { Drawer } from '@/components/common/Modal';
import { getAllFeedback, getFeedbackStats, getSentimentTrend, getCategoryBreakdown, fetchFeedback, subscribeFeedbackChange } from '@/services/feedbackService';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Filter, X, Search, Download, Loader2, Plus, Users, Eye, Camera } from 'lucide-react';
import { CreateFormModal } from '@/components/forms/CreateFormModal';
import { ImageLightboxModal } from '@/components/common/ImageUpload';
import { getFullImageUrl } from '@/services/uploadService';
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
  const userDept = user?.department || 'Artificial Intelligence & Data Science';
  const isDeptScoped = role === 'hod' || role === 'faculty';
  const initialDept = isDeptScoped ? userDept : (department || user?.department || 'all');

  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>(initialDept);
  const [sourceFilter, setSourceFilter] = useState<'all' | 'student' | 'faculty'>(role === 'faculty' ? 'student' : 'all');
  const [selected, setSelected] = useState<Feedback | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [allFeedback, setAllFeedback] = useState<Feedback[]>([]);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [selectedLightboxFeedback, setSelectedLightboxFeedback] = useState<Feedback | null>(null);
  const navigate = useNavigate();

  // Active department: strictly enforced for HOD and Faculty
  const activeDept = isDeptScoped ? userDept : (selectedDeptFilter !== 'all' ? selectedDeptFilter : undefined);
  const effectiveSource = role === 'faculty' ? 'student' : (sourceFilter !== 'all' ? sourceFilter : undefined);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setApiError(null);
      try {
        const items = await fetchFeedback({
          department: activeDept,
          source: effectiveSource,
        });
        if (mounted) setAllFeedback(items);
      } catch (err: any) {
        console.warn('[FeedbackPage] fetchFeedback failed:', err);
        if (mounted) {
          if (err.status !== 401 && err.status !== 403) {
            setApiError(err.message || 'Failed to sync live feedback.');
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    const unsub = subscribeFeedbackChange(items => {
      if (mounted) setAllFeedback(items);
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, [activeDept, effectiveSource]);

  const baseFeedback = isDeptScoped
    ? allFeedback.filter(f => f.department === userDept)
    : (selectedDeptFilter !== 'all' ? allFeedback.filter(f => f.department === selectedDeptFilter) : allFeedback);

  let filtered = baseFeedback;
  if (role !== 'faculty' && sourceFilter !== 'all') {
    filtered = filtered.filter(f => !f.submitterRole || f.submitterRole === sourceFilter);
  }
  if (searchQuery) {
    const l = searchQuery.toLowerCase();
    filtered = filtered.filter(f =>
      (f.comment || '').toLowerCase().includes(l) ||
      (f.category || '').toLowerCase().includes(l) ||
      (f.issue || '').toLowerCase().includes(l) ||
      (f.department || '').toLowerCase().includes(l)
    );
  }
  if (sentimentFilter !== 'all') filtered = filtered.filter(f => f.sentiment === sentimentFilter);
  if (statusFilter !== 'all') {
    filtered = filtered.filter(f => {
      if (statusFilter === 'submitted') return f.status === 'submitted' || f.status === 'received';
      if (statusFilter === 'action_taken') return f.status === 'action_taken' || f.status === 'in_progress' || f.status === 'action_planned';
      return f.status === statusFilter;
    });
  }
  if (categoryFilter !== 'all') filtered = filtered.filter(f => f.category === categoryFilter);

  const categories = ['Teaching', 'Laboratory', 'Internet', 'Infrastructure', 'Hostel', 'Canteen', 'Transport', 'Placement', 'Library', 'Examination'];
  const statuses: FeedbackStatus[] = ['submitted', 'under_review', 'action_taken', 'resolved'];

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
    if (role !== 'faculty') setSourceFilter('all');
    setSelectedDeptFilter(isDeptScoped ? userDept : 'all');
  };

  const pageTitle = role === 'faculty'
    ? 'Department Student Feedback'
    : (role === 'hod' ? 'Department Feedback Stream' : 'Feedback Stream');
  const pageSubtitle = isDeptScoped
    ? `${userDept} feedback · ${filtered.length} responses`
    : (selectedDeptFilter !== 'all' ? `${selectedDeptFilter} feedback · ${filtered.length} responses` : `All institutional feedback · ${filtered.length} responses`);

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{pageTitle}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {pageSubtitle}
          </p>
        </div>

        {role === 'hod' && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/hod/forms')}
              className="text-xs flex items-center gap-1.5"
            >
              <Users size={14} /> Survey Intelligence
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowCreateModal(true)}
              className="text-xs flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={15} /> Create Survey
            </Button>
          </div>
        )}
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

      {/* Source Filter for HOD & Management */}
      {role !== 'faculty' && (
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1 whitespace-nowrap">Source:</span>
          {(['all', 'student', 'faculty'] as const).map(src => {
            const isActive = sourceFilter === src;
            const label = src === 'all' ? 'All Submissions' : src === 'student' ? 'Student Feedback' : 'Faculty Feedback';
            return (
              <button
                key={src}
                onClick={() => setSourceFilter(src)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search feedback..." className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          {isDeptScoped ? (
            <div className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center whitespace-nowrap">
              <span>Department: {userDept}</span>
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
                    {(fb.imageUrl || fb.image_url) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLightboxFeedback(fb);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 hover:text-blue-300 border border-blue-500/30 transition-all cursor-pointer"
                        title="View student uploaded image along with feedback"
                      >
                        <Eye size={11} />
                        <span>View Image</span>
                      </button>
                    )}
                    {fb.submitterRole === 'faculty' ? (
                      <Badge variant="info">Faculty</Badge>
                    ) : (
                      <Badge variant="low">Student</Badge>
                    )}
                    {fb.anonymous && <Badge variant="ai">Anonymous</Badge>}
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-200 mb-1">{fb.comment}</p>
                  <p className="text-xs text-slate-400">{fb.department || fb.floor || fb.bus_number || 'General'}{fb.year ? ` · ${fb.year}` : ''} · {new Date(fb.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
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
              {(selected.imageUrl || selected.image_url) && (
                <button
                  type="button"
                  onClick={() => setSelectedLightboxFeedback(selected)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 hover:text-white border border-blue-500/40 hover:border-blue-400 transition-all shadow-sm cursor-pointer"
                  title="View student uploaded image along with feedback"
                >
                  <Eye size={12} />
                  <span>View Image</span>
                </button>
              )}
              {selected.submitterRole && (
                <Badge variant={selected.submitterRole === 'faculty' ? 'info' : 'low'}>
                  {selected.submitterRole === 'faculty' ? 'Faculty Member' : 'Student'}
                </Badge>
              )}
              {selected.anonymous && <Badge variant="ai">Anonymous</Badge>}
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Comment</p>
              <p className="text-sm text-slate-700 dark:text-slate-200">{selected.comment}</p>
            </div>
            {(selected.imageUrl || selected.image_url) && (
              <div>
                <p className="text-xs text-slate-400 mb-1.5">Attached Image Evidence</p>
                <div
                  onClick={() => setSelectedLightboxFeedback(selected)}
                  className="group relative cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-black/40 aspect-video max-h-48 transition-all hover:border-blue-400/50"
                  title="Click to view full image"
                >
                  <img
                    src={getFullImageUrl(selected.imageUrl || selected.image_url!)}
                    alt="Feedback attachment"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1.5 text-xs font-medium">
                    <Eye size={14} /> Click to View Full Image
                  </div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-slate-400 mb-1">Department</p><p className="text-sm font-medium text-slate-700 dark:text-slate-200">{selected.department}</p></div>
              <div><p className="text-xs text-slate-400 mb-1">Year</p><p className="text-sm font-medium text-slate-700 dark:text-slate-200">{selected.year || '—'}</p></div>
              <div><p className="text-xs text-slate-400 mb-1">Date</p><p className="text-sm font-medium text-slate-700 dark:text-slate-200">{new Date(selected.date).toLocaleDateString()}</p></div>
              <div><p className="text-xs text-slate-400 mb-1">AI Issue</p><p className="text-sm font-medium text-slate-700 dark:text-slate-200">{selected.issue}</p></div>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate(`/${role}/issues`)}>View Related Issue</Button>
          </div>
        )}
      </Drawer>

      {/* Create Survey Modal for HOD */}
      {role === 'hod' && (
        <CreateFormModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          departmentName={userDept}
          onSuccess={(newForm) => {
            setShowCreateModal(false);
            if (newForm?.id) {
              navigate(`/hod/forms/${newForm.id}`);
            } else {
              navigate('/hod/forms');
            }
          }}
        />
      )}
      {/* Lightbox Modal */}
      {selectedLightboxFeedback && (
        <ImageLightboxModal
          isOpen={Boolean(selectedLightboxFeedback)}
          imageUrl={selectedLightboxFeedback.imageUrl || selectedLightboxFeedback.image_url}
          title={`${selectedLightboxFeedback.floor || selectedLightboxFeedback.bus_number || selectedLightboxFeedback.department || 'Campus'} · ${selectedLightboxFeedback.category}`}
          feedback={{
            id: selectedLightboxFeedback.id,
            comment: selectedLightboxFeedback.comment,
            sentiment: selectedLightboxFeedback.sentiment,
            status: selectedLightboxFeedback.status,
            category: selectedLightboxFeedback.category,
            scope: selectedLightboxFeedback.floor || selectedLightboxFeedback.bus_number || selectedLightboxFeedback.department || undefined,
            date: selectedLightboxFeedback.date,
            anonymous: selectedLightboxFeedback.anonymous,
            submitterRole: selectedLightboxFeedback.submitterRole,
            portal: selectedLightboxFeedback.portal
          }}
          onClose={() => setSelectedLightboxFeedback(null)}
        />
      )}
    </div>
  );
}
