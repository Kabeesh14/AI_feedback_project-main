import { getAllAlerts } from '@/services/alertService';
import { AlertTriangle, CheckCircle, Info, AlertCircle, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export function NotificationDropdown({ onClose }: { onClose: () => void }) {
  const alerts = getAllAlerts();
  const navigate = useNavigate();
  const { user } = useAuth();

  const icons = {
    critical: AlertTriangle,
    warning: AlertCircle,
    success: CheckCircle,
    info: Info,
  };

  const colors = {
    critical: 'text-red-500 bg-red-50 dark:bg-red-900/20',
    warning: 'text-orange-500 bg-orange-50 dark:bg-orange-900/20',
    success: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
    info: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20',
  };

  const timeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ago`;
  };

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-40 animate-in fade-in slide-in-from-top-2 duration-200">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-slate-500 dark:text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Notifications</h3>
            <span className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">{alerts.filter(a => !a.read).length}</span>
          </div>
          <button className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Mark all read</button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {alerts.map(alert => {
            const Icon = icons[alert.severity];
            return (
              <button
                key={alert.id}
                onClick={() => { navigate(`/${user?.role}/alerts`); onClose(); }}
                className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left border-b border-slate-100 dark:border-slate-700/50 last:border-0"
              >
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colors[alert.severity]}`}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{alert.issue}</p>
                    {!alert.read && <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{alert.reason}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{timeAgo(alert.timestamp)}</p>
                </div>
              </button>
            );
          })}
        </div>
        <button
          onClick={() => { navigate(`/${user?.role}/alerts`); onClose(); }}
          className="w-full px-4 py-2.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-t border-slate-200 dark:border-slate-700"
        >
          View All Alerts
        </button>
      </div>
    </>
  );
}
