import { Card, Badge, Button } from '@/components/common/UI';
import { AlertTriangle, CheckCircle, Info, AlertCircle, Bell, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchActions } from '@/services/actionService';
import type { Notification } from '@/types';

const typeConfig: Record<string, { icon: typeof AlertTriangle; color: string; bg: string }> = {
  critical_issue: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
  recurring_issue: { icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
  action_created: { icon: CheckCircle, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  improvement: { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  deadline: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
};

const timeAgo = (ts: string) => {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

export function StudentNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    let mounted = true;
    async function loadNotifications() {
      try {
        const portal = user?.portal || 'education';
        const actions = await fetchActions(user?.department, { portal }).catch(() => []);
        if (mounted && actions && actions.length > 0) {
          const generated: Notification[] = actions.slice(0, 10).map((a, i) => ({
            id: `notif-act-${a.id || i}`,
            type: a.priority === 'critical' ? 'critical_issue' : 'action_created',
            title: a.title || a.action,
            message: a.description || `Corrective action status: ${(a.status || 'planned').replace('_', ' ')} (${a.department || a.portal || 'Campus'})`,
            timestamp: a.createdAt || new Date().toISOString(),
            read: false
          }));
          setNotifications(generated);
        }
      } catch (err) {
        console.warn('Failed to load action notifications:', err);
      }
    }
    loadNotifications();
    return () => { mounted = false; };
  }, [user?.portal, user?.department]);

  const filtered = filter === 'all' ? notifications : filter === 'unread' ? notifications.filter(n => !n.read) : notifications.filter(n => n.type === filter);

  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  const markRead = (id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Notifications</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Stay updated on your feedback and institutional actions</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>Mark all read</Button>
        )}
      </div>

      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        {[
          { value: 'all', label: 'All' },
          { value: 'unread', label: `Unread (${unreadCount})` },
          { value: 'critical_issue', label: 'Critical' },
          { value: 'improvement', label: 'Improvements' },
          { value: 'action_created', label: 'Actions' },
        ].map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all backdrop-blur-md ${
              filter === f.value
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                : 'bg-white/60 dark:bg-white/[0.04] text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-white/10 hover:border-cyan-400/30'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <Bell size={40} className="text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-300 font-medium">No notifications for {user?.portal === 'bus' ? 'Bus Transport' : user?.portal === 'hostel' ? 'Hostel Residence' : 'Academic Education'}</p>
            <p className="text-xs text-slate-500 mt-1">You are all caught up with your recent feedback updates and institutional notices.</p>
          </Card>
        ) : (
          filtered.map(n => {
            const cfg = typeConfig[n.type] || typeConfig.info;
            const Icon = cfg.icon;
            return (
              <Card
                key={n.id}
                className={`p-4 cursor-pointer transition-all ${
                  !n.read ? 'ring-1 ring-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]' : ''
                }`}
                hover
                onClick={() => markRead(n.id)}
              >
                <div className="flex items-start gap-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                    <Icon size={18} className={cfg.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{n.title}</p>
                      {!n.read && <span className="h-2 w-2 rounded-full bg-cyan-400 flex-shrink-0 shadow-[0_0_8px_rgba(6,182,212,0.8)] animate-pulse" />}
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{n.message}</p>
                    <p className="text-xs text-slate-400 mt-1">{timeAgo(n.timestamp)}</p>
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
