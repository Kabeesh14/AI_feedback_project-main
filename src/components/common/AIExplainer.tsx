import { useState, useEffect, type ReactNode } from 'react';
import { HelpCircle, Loader2 } from 'lucide-react';
import { Modal } from './Modal';
import { getAIExplanation, fetchExplainability } from '@/services/aiService';

interface AIExplainerProps {
  insightType: string;
  label?: string;
  issueId?: string | number;
}

export function AIExplainer({ insightType, label = 'Why am I seeing this?', issueId }: AIExplainerProps) {
  const [open, setOpen] = useState(false);
  const [liveData, setLiveData] = useState<{ title?: string; whyThisAppears?: string[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const defaultExplanation = getAIExplanation(insightType);

  useEffect(() => {
    let mounted = true;
    if (open && issueId) {
      setLoading(true);
      fetchExplainability(issueId)
        .then(res => {
          if (mounted && res?.success && res.data) {
            setLiveData({
              title: res.data.title ? `Explainability: ${res.data.title}` : undefined,
              whyThisAppears: Array.isArray(res.data.whyThisAppears) ? res.data.whyThisAppears : []
            });
          }
        })
        .catch(() => {
          if (mounted) setLiveData(null);
        })
        .finally(() => {
          if (mounted) setLoading(false);
        });
    } else {
      setLiveData(null);
    }
    return () => {
      mounted = false;
    };
  }, [open, issueId]);

  const modalTitle = liveData?.title || defaultExplanation.title;
  const reasons = (liveData?.whyThisAppears && liveData.whyThisAppears.length > 0)
    ? liveData.whyThisAppears
    : defaultExplanation.reasons;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-medium transition-colors"
      >
        <HelpCircle size={14} />
        {label}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={modalTitle} size="sm">
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
              AI Explainability
            </span>
            <span className="text-xs text-slate-400">
              {liveData?.whyThisAppears ? 'Database Evidence' : 'Analytical Criteria'}
            </span>
          </div>
          {loading ? (
            <div className="py-6 flex flex-col items-center justify-center text-slate-400">
              <Loader2 size={24} className="animate-spin text-violet-500 mb-2" />
              <p className="text-xs">Loading evidence for this issue...</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {reasons.map((reason, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-violet-500 flex-shrink-0" />
                  {reason}
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-700">
            Explanations reflect verified analytical criteria and database evidence logged across submitted feedback.
          </p>
        </div>
      </Modal>
    </>
  );
}

export function AIBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
      <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
      {children}
    </span>
  );
}
