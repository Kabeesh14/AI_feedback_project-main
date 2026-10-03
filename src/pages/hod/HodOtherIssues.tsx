import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, Button, Badge } from '@/components/common/UI';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  RefreshCw,
  ImageIcon,
  Eye,
  Building,
  Layers,
  Sparkles,
  User,
  Hash,
  GraduationCap,
  Calendar,
  AlertCircle,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import {
  fetchEducationOtherIssues,
  updateEducationIssueStatus,
  type EducationOtherIssue,
  type OtherIssuesSummary,
  type SectorBreakdownItem
} from '@/services/feedbackService';
import { ImageLightboxModal } from '@/components/common/ImageUpload';

const SECTOR_ICONS: Record<string, string> = {
  'Library': '📚',
  'Food / Canteen': '🍽️',
  'Canteen': '🍽️',
  'Classroom': '🏫',
  'Laboratory': '🔬',
  'Restroom': '🚻',
  'Furniture / Infrastructure': '🪑',
  'Infrastructure': '🪑',
  'Computer / IT': '💻',
  'Internet': '💻',
  'Electricity': '⚡',
  'Other campus facilities': '🏢',
  'Other': '🏢'
};

const SECTOR_COLORS: Record<string, string> = {
  'Laboratory': '#6366f1',
  'Food / Canteen': '#f59e0b',
  'Library': '#06b6d4',
  'Classroom': '#3b82f6',
  'Restroom': '#ec4899',
  'Furniture / Infrastructure': '#8b5cf6',
  'Computer / IT': '#10b981',
  'Electricity': '#eab308',
  'Other campus facilities': '#64748b'
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'action_taken', label: 'Action Taken' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' }
];

export function HodOtherIssues() {
  const { user } = useAuth();
  const department = user?.department || 'Civil Engineering';

  // Data states
  const [issues, setIssues] = useState<EducationOtherIssue[]>([]);
  const [summary, setSummary] = useState<OtherIssuesSummary>({
    totalIssues: 0,
    pendingIssues: 0,
    resolvedIssues: 0,
    topSector: 'None'
  });
  const [sectorBreakdown, setSectorBreakdown] = useState<SectorBreakdownItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Image lightbox modal state
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);
  const [lightboxIssue, setLightboxIssue] = useState<EducationOtherIssue | null>(null);

  // Load issues from real backend
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchEducationOtherIssues({
        sector: selectedSector !== 'all' ? selectedSector : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        search: searchQuery.trim() || undefined,
        department: user?.role === 'management' ? undefined : department,
        limit: 100
      });

      setIssues(response.issues || []);
      setSummary(response.summary || {
        totalIssues: 0,
        pendingIssues: 0,
        resolvedIssues: 0,
        topSector: 'None'
      });
      setSectorBreakdown(response.sectorBreakdown || []);
    } catch (err: any) {
      console.error('[HodOtherIssues] Error loading issues:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to load issues.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [department, selectedSector, selectedStatus]);

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle status update
  const handleStatusChange = async (issueId: number, newStatus: string) => {
    setUpdatingId(issueId);
    try {
      await updateEducationIssueStatus(issueId, newStatus);
      // Update local state immediately
      setIssues((prev) =>
        prev.map((item) => (item.id === issueId ? { ...item, status: newStatus } : item))
      );
      // Refresh summary
      loadData();
    } catch (err: any) {
      console.error('[HodOtherIssues] Failed to update status:', err);
      alert(err?.response?.data?.message || 'Failed to update issue status.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Sector list for dropdown
  const allSectorsList = useMemo(() => {
    const list = new Set<string>();
    sectorBreakdown.forEach((s) => list.add(s.sector));
    return Array.from(list);
  }, [sectorBreakdown]);

  return (
    <div className="space-y-6 pb-12 font-['Onest',sans-serif] animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              Education Portal · HOD Oversight
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">· {department}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <AlertCircle className="w-7 h-7 text-indigo-500" />
            Other Issues — Student Reports
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            Campus facilities, laboratory infrastructure, and service issues reported directly by students in your department.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Issues */}
        <Card className="p-5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200 dark:border-white/10 shadow-sm rounded-xl">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Campus Issues</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
              <Layers size={18} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {summary.totalIssues}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Recorded in {department}
          </p>
        </Card>

        {/* Pending Issues */}
        <Card className="p-5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200 dark:border-white/10 shadow-sm rounded-xl">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Action Needed / Pending</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
              <Clock size={18} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400">
            {summary.pendingIssues}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Unresolved student issues
          </p>
        </Card>

        {/* Resolved Issues */}
        <Card className="p-5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200 dark:border-white/10 shadow-sm rounded-xl">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Resolved</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {summary.resolvedIssues}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Actions successfully completed
          </p>
        </Card>

        {/* Top Concentration Sector */}
        <Card className="p-5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200 dark:border-white/10 shadow-sm rounded-xl">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Highest Concern Sector</span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500">
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white truncate" title={summary.topSector}>
            {summary.topSector}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Most frequent student complaint area
          </p>
        </Card>
      </div>

      {/* Sector-wise Issue Analysis Section */}
      <Card className="p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200 dark:border-white/10 shadow-sm rounded-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              Education Sector Issue Concentration
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Identifies which campus facility sectors are receiving the highest concentration of student issues.
            </p>
          </div>

          <div className="text-xs text-slate-500 bg-slate-100 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/5">
            Database Aggregated · {sectorBreakdown.length} active sectors
          </div>
        </div>

        {sectorBreakdown.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">
            No campus issue data available for sector analysis in this department.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Chart */}
            <div className="lg:col-span-7 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={sectorBreakdown}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="sector"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    width={140}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '12px'
                    }}
                    formatter={(val: any) => [`${val} issues`, 'Count']}
                  />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={18}>
                    {sectorBreakdown.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={SECTOR_COLORS[entry.sector] || '#6366f1'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Sector Breakdown Pills & Percentage List */}
            <div className="lg:col-span-5 space-y-2.5">
              {sectorBreakdown.map((item) => {
                const icon = SECTOR_ICONS[item.sector] || '📍';
                const isSelected = selectedSector === item.sector;
                return (
                  <button
                    key={item.sector}
                    onClick={() =>
                      setSelectedSector(isSelected ? 'all' : item.sector)
                    }
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-indigo-500/10 border-indigo-500/50 shadow-sm'
                        : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-lg leading-none">{icon}</span>
                      <div className="truncate">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {item.sector}
                        </div>
                        <div className="w-28 sm:w-40 bg-slate-200 dark:bg-white/10 h-1.5 rounded-full mt-1.5 overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full"
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {item.count}
                      </span>
                      <span className="text-[11px] text-slate-500 ml-1">
                        ({item.percentage}%)
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {/* Filter & Search Bar */}
      <Card className="p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200 dark:border-white/10 shadow-sm rounded-xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search student, reg no, issue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Sector & Status Filters */}
          <div className="flex items-center gap-2.5 w-full md:w-auto">
            {/* Sector filter */}
            <div className="flex-1 md:flex-initial">
              <select
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
                className="w-full md:w-44 px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Sectors</option>
                {allSectorsList.map((sec) => (
                  <option key={sec} value={sec}>
                    {sec}
                  </option>
                ))}
              </select>
            </div>

            {/* Status filter */}
            <div className="flex-1 md:flex-initial">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full md:w-36 px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Reset Filters */}
            {(selectedSector !== 'all' || selectedStatus !== 'all' || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedSector('all');
                  setSelectedStatus('all');
                  setSearchQuery('');
                }}
                className="text-xs text-indigo-500 hover:text-indigo-600"
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Student Issues List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Reported Student Issues ({issues.length})
          </h3>
          <span className="text-xs text-slate-500">
            Showing issues within {department} scope
          </span>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
            <p className="text-xs text-slate-500">Loading student issue reports from database...</p>
          </div>
        ) : issues.length === 0 ? (
          <Card className="p-12 text-center bg-white/50 dark:bg-slate-900/50 border border-dashed border-slate-300 dark:border-white/10 rounded-2xl">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3 opacity-60" />
            <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
              No Issues Found
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              There are currently no student-reported issues matching the selected filters for {department}.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {issues.map((item) => {
              const icon = SECTOR_ICONS[item.sector] || '📍';
              const isResolved = item.status === 'resolved' || item.status === 'closed';

              return (
                <Card
                  key={item.id}
                  className="p-5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border border-slate-200 dark:border-white/10 shadow-sm rounded-2xl hover:border-slate-300 dark:hover:border-white/20 transition-all space-y-4"
                >
                  {/* Top Bar: Student Identity & Sector Badge */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-white/5 pb-3.5">
                    {/* Student Identity */}
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-800 dark:text-slate-200 text-xs font-bold">
                        <User size={13} className="text-indigo-500" />
                        <span>{item.studentName}</span>
                      </div>

                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-mono font-medium border border-indigo-200 dark:border-indigo-900/50">
                        <Hash size={12} className="text-indigo-400" />
                        <span>{item.registerNumber}</span>
                      </div>

                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 text-xs">
                        <GraduationCap size={13} />
                        <span>{item.year}</span>
                      </div>

                      <span className="text-[11px] text-slate-400 flex items-center gap-1 ml-1">
                        <Calendar size={11} />
                        {new Date(item.submissionDate || item.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>

                    {/* Sector Badge & Reference Code */}
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 flex items-center gap-1">
                        <span>{icon}</span>
                        <span>{item.sector}</span>
                      </span>

                      <span className="font-mono text-[11px] text-slate-400">
                        {item.feedbackCode}
                      </span>
                    </div>
                  </div>

                  {/* Issue Description & Location */}
                  <div className="space-y-1.5">
                    {item.location && (
                      <div className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                        📍 Facility Location: {item.location}
                      </div>
                    )}
                    <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-normal">
                      {item.description}
                    </p>
                  </div>

                  {/* Bottom Controls: Image Viewing & Status Management */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    {/* Image Attachment Button */}
                    <div>
                      {item.imageUrl ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setLightboxImageUrl(item.imageUrl);
                            setLightboxIssue(item);
                          }}
                          className="flex items-center gap-2 text-xs border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10"
                        >
                          <Eye size={14} />
                          <span>View Image</span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-indigo-500/20 text-indigo-400 font-mono">
                            Evidence
                          </span>
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-400 italic">
                          No image attached
                        </span>
                      )}
                    </div>

                    {/* Current Status Badge & HOD Status Selector */}
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs text-slate-500">Status:</span>
                      <select
                        value={item.status}
                        disabled={updatingId === item.id}
                        onChange={(e) => handleStatusChange(item.id, e.target.value)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isResolved
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                            : item.status === 'under_review' || item.status === 'action_taken'
                            ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800'
                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                        }`}
                      >
                        <option value="submitted">Submitted</option>
                        <option value="under_review">Under Review</option>
                        <option value="action_taken">Action Taken</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Reusable Image Lightbox Modal for Image Viewing */}
      {lightboxImageUrl && (
        <ImageLightboxModal
          isOpen={Boolean(lightboxImageUrl)}
          imageUrl={lightboxImageUrl}
          title={`Student Evidence · ${lightboxIssue?.studentName || 'Student'} (${lightboxIssue?.registerNumber || ''})`}
          feedback={
            lightboxIssue
              ? ({
                  id: String(lightboxIssue.id),
                  feedbackCode: lightboxIssue.feedbackCode,
                  studentName: lightboxIssue.studentName,
                  department: lightboxIssue.department,
                  category: lightboxIssue.sector,
                  comment: lightboxIssue.description,
                  status: lightboxIssue.status,
                  createdAt: lightboxIssue.createdAt,
                  portal: 'education'
                } as any)
              : null
          }
          onClose={() => {
            setLightboxImageUrl(null);
            setLightboxIssue(null);
          }}
        />
      )}
    </div>
  );
}
export default HodOtherIssues;
