import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Badge, Button, SeverityBadge } from '@/components/common/UI';
import { getOverview, type InstitutionImpactOverviewData, type ActionImpactItem } from '@/services/impactService';
import { OFFICIAL_DEPARTMENTS, type Severity } from '@/types';
import {
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  XCircle,
  Building2,
  Filter,
  ArrowRight,
  Search,
  RefreshCw,
  Loader2,
  ShieldCheck,
  Calendar,
  Layers
} from 'lucide-react';

export function ManagementImpactOverview() {
  const navigate = useNavigate();

  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [effectivenessFilter, setEffectivenessFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [data, setData] = useState<InstitutionImpactOverviewData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (dept: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getOverview(dept === 'ALL' ? undefined : dept);
      setData(result);
    } catch (err: any) {
      console.error('[ManagementImpactOverview] Load failed:', err);
      setError(err?.message || 'Failed to load institution impact overview.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(departmentFilter);
  }, [departmentFilter]);

  // Client-side filtering on returned actions
  const filteredActions = useMemo(() => {
    if (!data?.actions) return [];
    return data.actions.filter((item: ActionImpactItem) => {
      // Effectiveness filter
      if (effectivenessFilter !== 'ALL' && item.effectiveness !== effectivenessFilter) {
        return false;
      }
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesDept = item.department.toLowerCase().includes(q);
        const matchesId = item.id.includes(q);
        if (!matchesTitle && !matchesDept && !matchesId) return false;
      }
      return true;
    });
  }, [data?.actions, effectivenessFilter, searchQuery]);

  const renderEffectivenessBadge = (effectiveness: string, dataSufficient: boolean) => {
    if (!dataSufficient || effectiveness === 'insufficient_data') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-700/60 dark:text-slate-300">
          <HelpCircle size={12} className="text-slate-500" />
          Insufficient Data
        </span>
      );
    }
    if (effectiveness === 'effective') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
          <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400" />
          Effective
        </span>
      );
    }
    if (effectiveness === 'partially_effective') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
          <AlertCircle size={12} className="text-amber-600 dark:text-amber-400" />
          Partially Effective
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
        <XCircle size={12} className="text-rose-600 dark:text-rose-400" />
        Not Effective
      </span>
    );
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr).slice(0, 10);
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return String(dateStr).slice(0, 10);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              Management Monitoring
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <ShieldCheck size={13} className="text-slate-400" />
              Read-Only
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            Institution-Wide Impact Overview
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Monitor real feedback changes and measurable outcomes for completed corrective actions across all departments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(departmentFilter)}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <Card className="p-4 border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20">
          <div className="flex items-center gap-3 text-rose-700 dark:text-rose-300">
            <AlertCircle size={20} className="shrink-0" />
            <div className="text-sm font-medium flex-1">{error}</div>
            <Button size="sm" variant="outline" onClick={() => loadData(departmentFilter)}>
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* Loading state skeleton */}
      {loading && !data && (
        <div className="py-16 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 gap-3">
          <Loader2 size={36} className="animate-spin text-blue-600 dark:text-blue-400" />
          <p className="text-sm font-medium">Evaluating institutional corrective action impact...</p>
        </div>
      )}

      {data && (
        <>
          {/* SECTION A: Institutional KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {/* Total Completed */}
            <Card className="p-4 border-slate-200 dark:border-slate-700/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Total Completed
                </span>
                <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  <CheckCircle2 size={16} />
                </span>
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                {data.kpis.totalCompletedActions}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Completed actions
              </div>
            </Card>

            {/* Measurable Impact */}
            <Card className="p-4 border-slate-200 dark:border-slate-700/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Measurable
                </span>
                <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                  <TrendingUp size={16} />
                </span>
              </div>
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-2">
                {data.kpis.measurableImpactActions}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Sufficient post-feedback
              </div>
            </Card>

            {/* Insufficient Data */}
            <Card className="p-4 border-slate-200 dark:border-slate-700/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Insufficient
                </span>
                <span className="p-1.5 rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300">
                  <HelpCircle size={16} />
                </span>
              </div>
              <div className="text-2xl font-bold text-slate-600 dark:text-slate-300 mt-2">
                {data.kpis.insufficientDataActions}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Awaiting responses (&lt;2)
              </div>
            </Card>

            {/* Effective */}
            <Card className="p-4 border-emerald-200/60 dark:border-emerald-800/40 bg-emerald-50/20 dark:bg-emerald-950/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Effective
                </span>
                <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  <CheckCircle2 size={16} />
                </span>
              </div>
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-2">
                {data.kpis.effectiveActions}
              </div>
              <div className="text-xs text-emerald-600/80 dark:text-emerald-400/70 mt-1">
                Significant gain
              </div>
            </Card>

            {/* Partially Effective */}
            <Card className="p-4 border-amber-200/60 dark:border-amber-800/40 bg-amber-50/20 dark:bg-amber-950/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Partial
                </span>
                <span className="p-1.5 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                  <AlertCircle size={16} />
                </span>
              </div>
              <div className="text-2xl font-bold text-amber-700 dark:text-amber-300 mt-2">
                {data.kpis.partiallyEffectiveActions}
              </div>
              <div className="text-xs text-amber-600/80 dark:text-amber-400/70 mt-1">
                Moderate improvement
              </div>
            </Card>

            {/* Not Effective */}
            <Card className="p-4 border-rose-200/60 dark:border-rose-800/40 bg-rose-50/20 dark:bg-rose-950/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400">
                  Not Effective
                </span>
                <span className="p-1.5 rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                  <XCircle size={16} />
                </span>
              </div>
              <div className="text-2xl font-bold text-rose-700 dark:text-rose-300 mt-2">
                {data.kpis.notEffectiveActions}
              </div>
              <div className="text-xs text-rose-600/80 dark:text-rose-400/70 mt-1">
                No complaint drop
              </div>
            </Card>
          </div>

          {/* SECTION B: Department Impact Summary Table */}
          <Card className="p-5 border-slate-200 dark:border-slate-700/60">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 size={18} className="text-slate-500" />
                  Department Impact Summary
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Aggregated evaluation counts by department based on real post-action feedback.
                </p>
              </div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {data.departments.length} department{data.departments.length !== 1 ? 's' : ''} represented
              </span>
            </div>

            {data.departments.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                No completed actions found for the selected scope.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700/60 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-3">Department</th>
                      <th className="py-3 px-3 text-right">Completed</th>
                      <th className="py-3 px-3 text-right">Measurable</th>
                      <th className="py-3 px-3 text-right text-emerald-700 dark:text-emerald-400">Effective</th>
                      <th className="py-3 px-3 text-right text-amber-700 dark:text-amber-400">Partial</th>
                      <th className="py-3 px-3 text-right text-rose-700 dark:text-rose-400">Not Effective</th>
                      <th className="py-3 px-3 text-right text-slate-600 dark:text-slate-400">Insufficient</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.departments.map((dept: any) => (
                      <tr
                        key={dept.department}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3 px-3 font-medium text-slate-900 dark:text-white">
                          {dept.department}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-slate-700 dark:text-slate-300">
                          {dept.completedActions}
                        </td>
                        <td className="py-3 px-3 text-right text-indigo-600 dark:text-indigo-400 font-medium">
                          {dept.measurableImpactActions}
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-emerald-700 dark:text-emerald-400">
                          {dept.effectiveActions}
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-amber-700 dark:text-amber-400">
                          {dept.partiallyEffectiveActions}
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-rose-700 dark:text-rose-400">
                          {dept.notEffectiveActions}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-500 dark:text-slate-400">
                          {dept.insufficientDataActions}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* SECTION C & D: Completed Action Impact Table + Filters */}
          <Card className="p-5 border-slate-200 dark:border-slate-700/60">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers size={18} className="text-slate-500" />
                  Completed Action Impact Evaluations
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Detailed before/after feedback metrics calculated from verified campus data.
                </p>
              </div>

              {/* Filters toolbar */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Department Filter */}
                <div className="flex items-center gap-1.5">
                  <Filter size={14} className="text-slate-400" />
                  <select
                    id="department-filter-select"
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ALL">All Departments</option>
                    {OFFICIAL_DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Effectiveness Filter */}
                <div className="flex items-center gap-1.5">
                  <select
                    id="effectiveness-filter-select"
                    value={effectivenessFilter}
                    onChange={(e) => setEffectivenessFilter(e.target.value)}
                    className="text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ALL">All Effectiveness</option>
                    <option value="effective">Effective</option>
                    <option value="partially_effective">Partially Effective</option>
                    <option value="not_effective">Not Effective</option>
                    <option value="insufficient_data">Insufficient Data</option>
                  </select>
                </div>

                {/* Search input */}
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search actions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"
                  />
                </div>
              </div>
            </div>

            {/* Actions Table */}
            {filteredActions.length === 0 ? (
              <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-sm">
                No completed actions match the selected filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700/60 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-3">Action</th>
                      <th className="py-3 px-3">Department</th>
                      <th className="py-3 px-3">Priority</th>
                      <th className="py-3 px-3">Completed Date</th>
                      <th className="py-3 px-3 text-center">Before Rating</th>
                      <th className="py-3 px-3 text-center">After Rating</th>
                      <th className="py-3 px-3 text-center">Complaint Drop</th>
                      <th className="py-3 px-3 text-center">Effectiveness</th>
                      <th className="py-3 px-3 text-center">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredActions.map((action: ActionImpactItem) => (
                      <tr
                        key={action.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3 px-3">
                          <div className="font-medium text-slate-900 dark:text-white line-clamp-1 max-w-xs">
                            {action.title}
                          </div>
                          <div className="text-xs text-slate-400 font-mono">
                            ID: #{action.id}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300 text-xs">
                          {action.department}
                        </td>
                        <td className="py-3 px-3">
                          <SeverityBadge severity={action.priority as Severity} />
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-400 text-xs whitespace-nowrap">
                          {formatDate(action.completedAt)}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-700 dark:text-slate-300 font-mono text-xs">
                          {action.beforeRating > 0 ? `${action.beforeRating} ★` : '—'}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-700 dark:text-slate-300 font-mono text-xs">
                          {action.dataSufficient && action.afterRating > 0
                            ? `${action.afterRating} ★`
                            : '—'}
                        </td>
                        <td className="py-3 px-3 text-center text-xs">
                          {action.dataSufficient ? (
                            <span
                              className={`font-mono font-medium ${
                                action.complaintReduction > 0
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : action.complaintReduction < 0
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-slate-500'
                              }`}
                            >
                              {action.complaintReduction > 0 ? `+${action.complaintReduction}%` : `${action.complaintReduction}%`}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {renderEffectivenessBadge(action.effectiveness, action.dataSufficient)}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-xs">
                          {action.dataSufficient ? (
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {action.effectivenessScore}/100
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

export default ManagementImpactOverview;
