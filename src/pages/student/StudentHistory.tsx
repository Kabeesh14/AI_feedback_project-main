import { useState } from 'react';
import { Card, Badge, SentimentBadge, StatusBadge, EmptyState, Button } from '@/components/common/UI';
import { Drawer } from '@/components/common/Modal';
import { getAllFeedback } from '@/services/feedbackService';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Filter, X, Clock, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';
import type { Feedback, FeedbackStatus } from '@/types';

const statusTimeline: { status: FeedbackStatus; label: string; icon: typeof Clock }[] = [
  { status: 'received', label: 'Feedback Submitted', icon: MessageSquare },
  { status: 'under_review', label: 'AI Categorized', icon: TrendingUp },
  { status: 'action_planned', label: 'HOD Reviewed', icon: AlertCircle },
  { status: 'in_progress', label: 'Action Planned', icon: Clock },
  { status: 'resolved', label: 'Action Completed', icon: CheckCircle },
];

export function StudentHistory() {
  const { user } = useAuth();
  const allFeedback = getAllFeedback(user?.department);
  const studentFeedback = allFeedback.slice(0, 50);
  const [selected, setSelected] = useState<Feedback | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const navigate = useNavigate();

  const filtered = filter === 'all' ? studentFeedback : studentFeedback.filter(f => f.status === filter);

  const filters: { value: string; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'received', label: 'Received' },
    { value: 'under_review', label: 'Under Review' },
    { value: 'action_planned', label: 'Action Planned' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'resolved', label: 'Resolved' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">My Feedback</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Track the journey of your feedback from submission to resolution {user?.department ? `· ${user.department}` : ''}
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        <Filter size={16} className="text-slate-400 flex-shrink-0" />
        {filters.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              filter === f.value
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<MessageSquare size={48} />}
          title="No feedback matches the selected filters"
          message="Try selecting a different filter to see your feedback history."
          actionLabel="Clear Filters"
          onAction={() => setFilter('all')}
        />
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700" />

          <div className="space-y-4">
            {filtered.map((fb, i) => (
              <div key={fb.id} className="relative pl-14">
                {/* Timeline dot */}
                <div className={`absolute left-3 top-3 h-5 w-5 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center ${
                  fb.status === 'resolved' ? 'bg-emerald-500' :
                  fb.status === 'in_progress' ? 'bg-amber-500' :
                  fb.status === 'action_planned' ? 'bg-violet-500' :
                  fb.status === 'under_review' ? 'bg-blue-500' :
                  'bg-slate-400'
                }`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                </div>

                <Card className="p-4 cursor-pointer" hover onClick={() => setSelected(fb)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <Badge variant="default">{fb.category}</Badge>
                        <SentimentBadge sentiment={fb.sentiment} />
                        {fb.anonymous && <Badge variant="ai">Anonymous</Badge>}
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-200 mb-1">{fb.comment}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(fb.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · {fb.department}
                      </p>
                    </div>
                    <StatusBadge status={fb.status} />
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      <Drawer open={!!selected} onClose={() => setSelected(null)} title="Feedback Details">
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="default">{selected.category}</Badge>
              <SentimentBadge sentiment={selected.sentiment} />
              <StatusBadge status={selected.status} />
              {selected.anonymous && <Badge variant="ai">Anonymous</Badge>}
            </div>

            <div>
              <p className="text-xs text-slate-400 mb-1">Your Comment</p>
              <p className="text-sm text-slate-700 dark:text-slate-200">{selected.comment}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-400 mb-1">Department</p>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{selected.department}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Date</p>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{new Date(selected.date).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">AI Theme</p>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{selected.theme}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">AI Issue</p>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{selected.issue}</p>
              </div>
            </div>

            {/* Status journey */}
            <div>
              <p className="text-xs text-slate-400 mb-3">Status Journey</p>
              <div className="space-y-3">
                {statusTimeline.map((step, i) => {
                  const currentIndex = statusTimeline.findIndex(s => s.status === selected.status);
                  const isDone = i <= currentIndex;
                  const Icon = step.icon;
                  return (
                    <div key={step.status} className="flex items-center gap-3">
                      <div className={`h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isDone ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-700/50 text-slate-400'
                      }`}>
                        <Icon size={14} />
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm ${isDone ? 'text-slate-700 dark:text-slate-200 font-medium' : 'text-slate-400'}`}>{step.label}</p>
                      </div>
                      {isDone && <CheckCircle size={14} className="text-emerald-500" />}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <Button variant="outline" size="sm" onClick={() => navigate('/student/feedback')}>Give More Feedback</Button>
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>Close</Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
