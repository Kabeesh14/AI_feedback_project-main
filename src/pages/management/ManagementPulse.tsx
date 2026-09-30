import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Badge, Button, SeverityBadge } from '@/components/common/UI';
import { AIBadge, AIExplainer } from '@/components/common/AIExplainer';
import { getCampusAreas, fetchSummary } from '@/services/analyticsService';
import { Activity, AlertTriangle, TrendingUp, TrendingDown, Building2, ChevronRight, Calendar, CheckCircle, Zap } from 'lucide-react';

export function ManagementPulse() {
  const navigate = useNavigate();
  const campusAreas = getCampusAreas();
  const [summaryData, setSummaryData] = useState<any>(null);

  useEffect(() => {
    fetchSummary()
      .then(data => {
        if (data) setSummaryData(data);
      })
      .catch(err => {
        console.warn('[ManagementPulse] fetchSummary failed:', err);
      });
  }, []);

  const whatChanged = summaryData?.cards || [];
  const timelineEvents = summaryData?.timeline || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <AIBadge>Institutional Pulse</AIBadge>
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
        {whatChanged.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {whatChanged.map((item: any, i: number) => (
              <button
                key={i}
                onClick={() => item.issueId ? navigate(`/management/issues/${item.issueId}`) : navigate('/management/issues')}
                className={`p-4 rounded-xl border ${item.border || 'border-slate-200 dark:border-slate-700'} ${item.bg || 'bg-slate-50 dark:bg-slate-800'} text-left transition-all hover:scale-105 hover:shadow-md cursor-pointer`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-bold uppercase tracking-wider ${item.color || 'text-blue-500'}`}>{item.type}</span>
                  <ChevronRight size={14} className="text-slate-400" />
                </div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">{item.label}</p>
                <p className="text-xs text-slate-400">{item.desc}</p>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400 text-center py-6">No new issue changes detected today. System monitoring live streams.</p>
        )}
      </Card>
      {/* Pulse Timeline */}
      <Card className="p-6 mb-6">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Institutional Pulse Timeline</h3>
        <div className="relative">
          <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700" />
          <div className="space-y-4">
            {timelineEvents.length > 0 ? (
              timelineEvents.map((event: any, i: number) => {
                const trendIcon = event.trend === 'up' ? <TrendingUp size={12} className="text-red-500" /> : event.trend === 'down' ? <TrendingDown size={12} className="text-emerald-500" /> : null;
                return (
                  <div key={i} className="relative flex items-start gap-4 pl-0">
                    <div className="relative z-10 h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 text-blue-500 bg-blue-50 dark:bg-blue-900/20">
                      <Activity size={18} />
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{event.day}</span>
                        {trendIcon}
                      </div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{event.title}</p>
                      <p className="text-xs text-slate-400">{event.desc}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-slate-400 text-center py-6">No timeline events recorded.</p>
            )}
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
          {campusAreas.length > 0 ? (
            campusAreas.map(area => (
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
            ))
          ) : (
            <p className="text-sm text-slate-400 text-center py-8 col-span-full">Campus area mapping is not currently available.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
