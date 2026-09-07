import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Badge, Button } from '@/components/common/UI';
import { getAllAlerts, markAlertRead, markAllRead, getAlertStats } from '@/services/alertService';
import { AlertTriangle, AlertCircle, CheckCircle, Info, Bell, Clock } from 'lucide-react';
import type { Role } from '@/types';
import { useAuth } from '@/context/AuthContext';

const severityConfig: Record<string, { icon: typeof AlertTriangle; color: string; bg: string; label: string }> = {
  critical: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', label: 'Critical' },
  warning: { icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20', label: 'Warning' },
  success: { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', label: 'Improvement' },
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', label: 'Info' },
};

const timeAgo = (ts: string) => {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ago`;
};

export function AlertsPage({ role }: { role: Role }) {
  const { user } = useAuth();
  const effectiveDept = role === 'hod' ? user?.department : (user?.department || undefined);
  const [alerts, setAlerts] = useState(() => getAllAlerts(effectiveDept));
  const [filter, setFilter] = useState<string>('all');
  const navigate = useNavigate();
  const stats = getAlertStats(effectiveDept);

  useEffect(() => {
    setAlerts(getAllAlerts(effectiveDept));
  }, [effectiveDept]);

  const filtered = filter === 'all' ? alerts : filter === 'unread' ? alerts.filter(a => !a.read) : alerts.filter(a => a.severity === filter);

  const handleMarkRead = (id: string) => {
    markAlertRead(id);
    setAlerts(getAllAlerts(effectiveDept));
  };

  const handleMarkAllRead = () => {
    markAllRead();
    setAlerts(getAllAlerts(effectiveDept));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Smart Alerts</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            AI-detected anomalies and trend-based notifications {effectiveDept ? `· ${effectiveDept}` : '· Institution-wide'}
          </p>
        </div>
        {stats.unread > 0 && <Button variant="outline" size="sm" onClick={handleMarkAllRead}>Mark all read</Button>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={16} className="text-red-500" />
            <span className="text-xs text-slate-400">Critical</span>
          </div>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.critical}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle size={16} className="text-orange-500" />
            <span className="text-xs text-slate-400">Warning</span>
          </div>
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.warning}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle size={16} className="text-emerald-500" />
            <span className="text-xs text-slate-400">Improvement</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.success}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Bell size={16} className="text-blue-500" />
            <span className="text-xs text-slate-400">Unread</span>
          </div>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.unread}</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        {[
          { value: 'all', label: 'All' },
          { value: 'unread', label: 'Unread' },
          { value: 'critical', label: 'Critical' },
          { value: 'warning', label: 'Warning' },
          { value: 'success', label: 'Improvement' },
        ].map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${filter === f.value ? 'bg-blue-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}>{f.label}</button>
        ))}
      </div>

      {/* Alerts list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <Bell size={40} className="text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No alerts to display</p>
          </Card>
        ) : (
          filtered.map(alert => {
            const cfg = severityConfig[alert.severity];
            const Icon = cfg.icon;
            return (
              <Card key={alert.id} className={`p-5 ${!alert.read ? 'ring-1 ring-blue-200 dark:ring-blue-800' : ''}`} hover onClick={() => handleMarkRead(alert.id)}>
                <div className="flex items-start gap-4">
                  <div className={`h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                    <Icon size={20} className={cfg.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-800 dark:text-slate-100">{alert.issue}</h3>
                      <Badge variant={alert.severity === 'critical' ? 'critical' : alert.severity === 'warning' ? 'warning' : alert.severity === 'success' ? 'success' : 'info'}>{cfg.label}</Badge>
                      {alert.department !== 'ALL' && <Badge variant="default">{alert.department}</Badge>}
                      {!alert.read && <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse ml-auto" />}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{alert.reason}</p>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock size={12} />
                        {timeAgo(alert.timestamp)}
                      </span>
                      <button onClick={(e) => { e.stopPropagation(); navigate(`/${role}/issues`); }} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">View Issue</button>
                      <button onClick={(e) => { e.stopPropagation(); navigate(`/${role}/actions`); }} className="text-xs text-violet-600 dark:text-violet-400 hover:underline">Create Action</button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
