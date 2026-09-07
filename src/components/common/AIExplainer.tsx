import { useState, type ReactNode } from 'react';
import { HelpCircle } from 'lucide-react';
import { Modal } from './Modal';
import { getAIExplanation } from '@/services/aiService';

interface AIExplainerProps {
  insightType: string;
  label?: string;
}

export function AIExplainer({ insightType, label = 'Why am I seeing this?' }: AIExplainerProps) {
  const [open, setOpen] = useState(false);
  const explanation = getAIExplanation(insightType);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-medium transition-colors"
      >
        <HelpCircle size={14} />
        {label}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={explanation.title} size="sm">
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
              AI Explainability
            </span>
            <span className="text-xs text-slate-400">Demo Data</span>
          </div>
          <ul className="space-y-2">
            {explanation.reasons.map((reason, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-violet-500 flex-shrink-0" />
                {reason}
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-700">
            This explanation is generated from mock AI analysis. In production, this would reflect actual model reasoning and confidence scores.
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
