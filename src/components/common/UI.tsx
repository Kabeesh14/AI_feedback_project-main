import type { ReactNode } from 'react';
import { type Severity, type Sentiment, type FeedbackStatus } from '@/types';

export function Card({ children, className = '', onClick, hover = false }: { children: ReactNode; className?: string; onClick?: () => void; hover?: boolean }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm ${
        hover ? 'transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function Badge({ children, variant = 'default', className = '' }: { children: ReactNode; variant?: 'default' | 'critical' | 'high' | 'medium' | 'low' | 'positive' | 'negative' | 'neutral' | 'ai' | 'info' | 'success' | 'warning'; className?: string }) {
  const variants: Record<string, string> = {
    default: 'bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300',
    critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    positive: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    negative: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    neutral: 'bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300',
    ai: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
    info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  const map: Record<Severity, { variant: 'critical' | 'high' | 'medium' | 'low'; label: string }> = {
    critical: { variant: 'critical', label: 'Critical' },
    high: { variant: 'high', label: 'High' },
    medium: { variant: 'medium', label: 'Medium' },
    low: { variant: 'low', label: 'Low' },
  };
  const { variant, label } = map[severity];
  return <Badge variant={variant}>{label}</Badge>;
}

export function SentimentBadge({ sentiment }: { sentiment: Sentiment }) {
  const map: Record<Sentiment, { variant: 'positive' | 'negative' | 'neutral'; label: string }> = {
    positive: { variant: 'positive', label: 'Positive' },
    negative: { variant: 'negative', label: 'Negative' },
    neutral: { variant: 'neutral', label: 'Neutral' },
  };
  const { variant, label } = map[sentiment];
  return <Badge variant={variant}>{label}</Badge>;
}

export function StatusBadge({ status }: { status: FeedbackStatus }) {
  const map: Record<FeedbackStatus, { variant: 'default' | 'info' | 'warning' | 'success' | 'ai'; label: string }> = {
    received: { variant: 'default', label: 'Received' },
    under_review: { variant: 'info', label: 'Under Review' },
    action_planned: { variant: 'ai', label: 'Action Planned' },
    in_progress: { variant: 'warning', label: 'In Progress' },
    resolved: { variant: 'success', label: 'Resolved' },
  };
  const { variant, label } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function Button({ children, onClick, variant = 'primary', size = 'md', className = '', type = 'button', disabled = false }: { children: ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'ai'; size?: 'sm' | 'md' | 'lg'; className?: string; type?: 'button' | 'submit'; disabled?: boolean }) {
  const variants: Record<string, string> = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600',
    ghost: 'hover:bg-slate-100 text-slate-700 dark:hover:bg-slate-700/50 dark:text-slate-300',
    outline: 'border border-slate-300 hover:bg-slate-50 text-slate-700 dark:border-slate-600 dark:hover:bg-slate-700/50 dark:text-slate-300',
    ai: 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm',
  };
  const sizes: Record<string, string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}

export function ProgressBar({ value, max = 100, className = '', color = 'blue' }: { value: number; max?: number; className?: string; color?: 'blue' | 'green' | 'red' | 'orange' | 'violet' }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-emerald-500',
    red: 'bg-red-500',
    orange: 'bg-orange-500',
    violet: 'bg-violet-500',
  };
  const percent = Math.min((value / max) * 100, 100);
  return (
    <div className={`h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden ${className}`}>
      <div className={`h-full rounded-full transition-all duration-700 ease-out ${colors[color]}`} style={{ width: `${percent}%` }} />
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700/50 ${className}`} />;
}

export function EmptyState({ icon, title, message, actionLabel, onAction }: { icon?: ReactNode; title: string; message: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="mb-4 text-slate-300 dark:text-slate-600">{icon}</div>}
      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-4">{message}</p>
      {actionLabel && onAction && (
        <Button variant="outline" onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );
}
