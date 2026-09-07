import { useNavigate } from 'react-router-dom';
import { Card, Badge, Button, SeverityBadge } from '@/components/common/UI';
import { AIBadge, AIExplainer } from '@/components/common/AIExplainer';
import { getCampusAreas, getInstitutionStats } from '@/services/analyticsService';
import { Activity, AlertTriangle, TrendingUp, TrendingDown, Building2, ChevronRight, Calendar, CheckCircle, Zap } from 'lucide-react';

const timelineEvents = [
  { day: 'MON', title: 'Wi-Fi issue detected', desc: 'AI flagged 12 complaints about Laboratory Wi-Fi', icon: AlertTriangle, color: 'text-red-500 bg-red-50 dark:bg-red-900/20', trend: 'up' },
  { day: 'TUE', title: 'Complaint spike', desc: 'Wi-Fi complaints increased to 28 in one day', icon: TrendingUp, color: 'text-orange-500 bg-orange-50 dark:bg-orange-900/20', trend: 'up' },
  { day: 'WED', title: 'HOD notified', desc: 'Department HOD received critical alert and reviewed issue', icon: Zap, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20', trend: 'neutral' },
  { day: 'THU', title: 'IT action created', desc: 'Corrective action: install additional access points', icon: CheckCircle, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20', trend: 'neutral' },
  { day: 'FRI', title: 'Complaints reduced', desc: 'Wi-Fi complaints dropped from 28 to 14', icon: TrendingDown, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20', trend: 'down' },
  { day: 'SAT', title: 'Improvement detected', desc: 'Negative sentiment reduced by 41 percentage points', icon: CheckCircle, color: 'text-green-500 bg-green-50 dark:bg-green-900/20', trend: 'down' },
];

const whatChanged = [
  { type: 'NEW', label: 'Hostel water complaint', desc: 'New issue detected today', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800/50', issueId: 'issue-3' },
  { type: 'GROWING', label: 'Wi-Fi complaints +43%', desc: 'Significant increase in 3 days', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800/50', issueId: 'issue-2' },
  { type: 'IMPROVING', label: 'Canteen complaints -28%', desc: 'Improvement after vendor change', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800/50', issueId: 'issue-4' },
  { type: 'RESOLVED', label: 'Library seating issue', desc: 'Marked as resolved after furniture addition', color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-700/30', border: 'border-slate-200 dark:border-slate-700', issueId: 'issue-7' },
];

export function ManagementPulse() {
  const navigate = useNavigate();
  const campusAreas = getCampusAreas();
  const stats = getInstitutionStats();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <AIBadge>Institutional Pulse</AIBadge>
            <span className="text-xs text-slate-400">Demo Data</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Institution Pulse Timeline</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">How issues change over time — the continuous nature of feedback intelligence</p>
        </div>
        <AIExplainer insightType="alert" />
      </div>

      {/* What Changed Today */}
      <Card className="p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={18} className="text-violet-500" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">What Changed Today?</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {whatChanged.map((item, i) => (
            <button
              key={i}
              onClick={() => navigate(`/management/issues/${item.issueId}`)}
              className={`p-4 rounded-xl border ${item.border} ${item.bg} text-left transition-all hover:scale-105 hover:shadow-md cursor-pointer`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-bold uppercase tracking-wider ${item.color}`}>{item.type}</span>
                <ChevronRight size={14} className="text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">{item.label}</p>
              <p className="text-xs text-slate-400">{item.desc}</p>
            </button>
          ))}
        </div>
      </Card>

      {/* Pulse Timeline */}
      <Card className="p-6 mb-6">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Institutional Pulse Timeline</h3>
        <div className="relative">
          <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700" />
          <div className="space-y-4">
            {timelineEvents.map((event, i) => {
              const Icon = event.icon;
              return (
                <div key={i} className="relative flex items-start gap-4 pl-0">
                  <div className={`relative z-10 h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${event.color}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{event.day}</span>
                      {event.trend === 'up' && <TrendingUp size={12} className="text-red-500" />}
                      {event.trend === 'down' && <TrendingDown size={12} className="text-emerald-500" />}
                    </div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{event.title}</p>
                    <p className="text-xs text-slate-400">{event.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Campus Issue Map */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">Institutional Issue Map</h3>
          <Button variant="ghost" size="sm" onClick={() => navigate('/management/issues')}>View All Issues <ChevronRight size={14} /></Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {campusAreas.map(area => (
            <button
              key={area.id}
              onClick={() => navigate('/management/issues')}
              className={`p-5 rounded-2xl border-2 text-left transition-all duration-300 hover:scale-105 hover:shadow-lg ${
                area.severity === 'critical' ? 'border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10' :
                area.severity === 'high' ? 'border-orange-300 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/10' :
                area.severity === 'medium' ? 'border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10' :
                'border-blue-300 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10'
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <Building2 size={18} className={
                  area.severity === 'critical' ? 'text-red-500' :
                  area.severity === 'high' ? 'text-orange-500' :
                  area.severity === 'medium' ? 'text-amber-500' :
                  'text-blue-500'
                } />
                <SeverityBadge severity={area.severity} />
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">{area.name}</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{area.issueCount}</p>
              <p className="text-xs text-slate-400">issues · {area.feedbackCount} feedback</p>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
