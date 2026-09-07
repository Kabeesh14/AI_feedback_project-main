import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, MessageSquare, AlertTriangle, Layers, CheckSquare, BellRing } from 'lucide-react';
import { searchFeedback } from '@/services/feedbackService';
import { searchIssues } from '@/services/issueService';
import { getAllThemes } from '@/services/analyticsService';
import { getAllActions } from '@/services/actionService';
import { getAllAlerts } from '@/services/alertService';
import { useAuth } from '@/context/AuthContext';
import { OFFICIAL_DEPARTMENTS } from '@/types';

interface SearchResult {
  type: 'theme' | 'issue' | 'feedback' | 'action' | 'alert';
  title: string;
  subtitle: string;
  path: string;
}

export function GlobalSearch({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim() || query.length < 2) return [];
    const l = query.toLowerCase();
    const results: SearchResult[] = [];

    // Themes
    getAllThemes().filter(t => t.name.toLowerCase().includes(l)).slice(0, 3).forEach(t => {
      results.push({ type: 'theme', title: t.name, subtitle: `${t.responses} responses · ${t.positivePercent}% positive`, path: `/${user?.role}/themes` });
    });

    // Issues
    searchIssues(query).slice(0, 4).forEach(i => {
      results.push({ type: 'issue', title: i.title, subtitle: `${i.complaintCount} complaints · ${i.severity}`, path: `/${user?.role}/issues` });
    });

    // Departments
    OFFICIAL_DEPARTMENTS.filter(d => d.toLowerCase().includes(l)).forEach(d => {
      results.push({ type: 'theme', title: d, subtitle: `Department Intelligence · 9 Official Departments`, path: `/${user?.role}/departments` });
    });

    // Feedback
    searchFeedback(query).slice(0, 4).forEach(f => {
      results.push({ type: 'feedback', title: f.comment.slice(0, 50) + (f.comment.length > 50 ? '...' : ''), subtitle: `${f.category} · ${f.sentiment} · ${f.department}`, path: `/${user?.role}/feedback` });
    });

    // Actions
    getAllActions().filter(a => a.action.toLowerCase().includes(l) || a.issueTitle.toLowerCase().includes(l)).slice(0, 3).forEach(a => {
      results.push({ type: 'action', title: a.action, subtitle: `${a.issueTitle} · ${a.status}`, path: `/${user?.role}/actions` });
    });

    // Alerts
    getAllAlerts().filter(a => a.issue.toLowerCase().includes(l) || a.reason.toLowerCase().includes(l)).slice(0, 2).forEach(a => {
      results.push({ type: 'alert', title: a.issue, subtitle: a.reason.slice(0, 60), path: `/${user?.role}/alerts` });
    });

    return results;
  }, [query, user]);

  const icons: Record<string, typeof Search> = {
    theme: Layers,
    issue: AlertTriangle,
    feedback: MessageSquare,
    action: CheckSquare,
    alert: BellRing,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <Search size={20} className="text-slate-400" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search themes, issues, feedback, actions, alerts..."
            className="flex-1 bg-transparent text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none text-sm"
          />
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
            <X size={18} />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {query.length < 2 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
              Type at least 2 characters to search across all data
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
              No results found for "{query}"
            </div>
          ) : (
            <div className="py-2">
              {results.map((result, i) => {
                const Icon = icons[result.type];
                return (
                  <button
                    key={i}
                    onClick={() => { navigate(result.path); onClose(); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
                  >
                    <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <Icon size={16} className="text-slate-500 dark:text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{result.title}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{result.subtitle}</p>
                    </div>
                    <span className="text-xs text-slate-400 capitalize px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700/50">{result.type}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
