import { useState, useEffect } from 'react';
import { Card, Badge, Button } from '@/components/common/UI';
import { useAuth } from '@/context/AuthContext';
import { useBusScope } from '@/context/BusScopeContext';
import { BusScopeSelector } from '@/components/bus/BusScopeSelector';
import type { Feedback } from '@/types';
import { fetchFeedback } from '@/services/feedbackService';
import { isMatchingBus, formatBusDisplay } from '@/utils/busUtils';
import {
  Bus,
  TrendingUp,
  BarChart3,
  PieChart,
  CheckCircle,
  AlertTriangle,
  Clock,
  Sparkles,
  Loader2
} from 'lucide-react';

export function BusAnalyticsPage() {
  const { user } = useAuth();
  const { selectedBus, effectiveBusNumber, isAllBuses } = useBusScope();

  const isBusIncharge = user?.role === 'bus_incharge';
  const userBusNumber = user?.bus_number || 'Bus 14';

  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        setLoading(true);
        const filters: Record<string, any> = { portal: 'bus' };
        if (effectiveBusNumber) {
          filters.bus_number = effectiveBusNumber;
        }
        const data = await fetchFeedback(filters);
        const scoped = effectiveBusNumber
          ? data.filter(f => isMatchingBus(f.bus_number, effectiveBusNumber))
          : data;
        if (mounted) setFeedback(scoped);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadData();
    return () => { mounted = false; };
  }, [user?.role, user?.bus_number, effectiveBusNumber]);

  // Category breakdown
  const categoryCounts: Record<string, number> = {};
  feedback.forEach(f => {
    const c = f.category || 'Other';
    categoryCounts[c] = (categoryCounts[c] || 0) + 1;
  });

  const total = feedback.length;
  const positive = feedback.filter(f => f.sentiment === 'positive').length;
  const neutral = feedback.filter(f => f.sentiment === 'neutral').length;
  const negative = feedback.filter(f => f.sentiment === 'negative').length;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">
            <Bus size={14} />
            <span>Transport Analytics</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">
            Bus Transport Insights
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Sentiment, category distribution, and punctuality performance for {effectiveBusNumber ? `${formatBusDisplay(effectiveBusNumber)} only` : 'all bus routes'}.
          </p>
        </div>

        <BusScopeSelector />
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 size={32} className="animate-spin text-amber-400 mb-3" />
          <p className="text-sm font-medium">Computing bus analytics...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Sentiment Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-xl">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Positive Sentiment</span>
              <p className="text-3xl font-extrabold text-emerald-300 mt-2">{positive}</p>
              <p className="text-xs text-slate-400 mt-1">
                {total > 0 ? `${Math.round((positive / total) * 100)}% of total feedback` : '0%'}
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-blue-500/10 border border-blue-500/20 backdrop-blur-xl">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Neutral Sentiment</span>
              <p className="text-3xl font-extrabold text-blue-300 mt-2">{neutral}</p>
              <p className="text-xs text-slate-400 mt-1">
                {total > 0 ? `${Math.round((neutral / total) * 100)}% of total feedback` : '0%'}
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 backdrop-blur-xl">
              <span className="text-xs font-bold uppercase tracking-wider text-red-400">Negative Sentiment</span>
              <p className="text-3xl font-extrabold text-red-300 mt-2">{negative}</p>
              <p className="text-xs text-slate-400 mt-1">
                {total > 0 ? `${Math.round((negative / total) * 100)}% of total feedback` : '0%'}
              </p>
            </div>
          </div>

          {/* Category Distribution Table */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-6 backdrop-blur-xl">
            <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <BarChart3 size={18} className="text-amber-400" />
              Feedback Volume by Category
            </h2>

            <div className="space-y-4">
              {Object.entries(categoryCounts).length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">No categories recorded yet.</p>
              ) : (
                Object.entries(categoryCounts).map(([cat, count]) => {
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={cat} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-white">{cat}</span>
                        <span className="text-slate-400">{count} submissions ({pct}%)</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
