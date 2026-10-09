import type { ReactNode } from 'react';
import { type Severity, type Sentiment, type FeedbackStatus } from '@/types';

export function Card({ children, className = '', onClick, hover = false }: { children: ReactNode; className?: string; onClick?: () => void; hover?: boolean }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white/[0.05] backdrop-blur-xl rounded-2xl border border-white/10 shadow-lg text-slate-100 ${
        hover ? 'transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] hover:border-cyan-400/40 hover:-translate-y-0.5 cursor-pointer' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function Badge({ children, variant = 'default', className = '' }: { children: ReactNode; variant?: 'default' | 'critical' | 'high' | 'medium' | 'low' | 'positive' | 'negative' | 'neutral' | 'ai' | 'info' | 'success' | 'warning'; className?: string }) {
  const variants: Record<string, string> = {
    default: 'bg-white/[0.08] text-slate-200 border border-white/10',
    critical: 'bg-red-500/15 text-red-300 border border-red-500/25',
    high: 'bg-orange-500/15 text-orange-300 border border-orange-500/25',
    medium: 'bg-amber-500/15 text-amber-300 border border-amber-500/25',
    low: 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/25',
    positive: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25',
    negative: 'bg-red-500/15 text-red-300 border border-red-500/25',
    neutral: 'bg-white/[0.08] text-slate-300 border border-white/10',
    ai: 'bg-violet-500/20 text-violet-300 border border-violet-500/30',
    info: 'bg-blue-500/15 text-blue-300 border border-blue-500/25',
    success: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25',
    warning: 'bg-amber-500/15 text-amber-300 border border-amber-500/25',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity?: Severity | string }) {
  const map: Record<string, { variant: 'critical' | 'high' | 'medium' | 'low'; label: string }> = {
    critical: { variant: 'critical', label: 'Critical' },
    high: { variant: 'high', label: 'High' },
    medium: { variant: 'medium', label: 'Medium' },
    low: { variant: 'low', label: 'Low' },
  };
  const normalized = (severity || 'medium').toLowerCase();
  const { variant, label } = map[normalized] || { variant: 'medium', label: severity || 'Medium' };
  return <Badge variant={variant}>{label}</Badge>;
}

export function SentimentBadge({ sentiment }: { sentiment?: Sentiment | string }) {
  const map: Record<string, { variant: 'positive' | 'negative' | 'neutral'; label: string }> = {
    positive: { variant: 'positive', label: 'Positive' },
    negative: { variant: 'negative', label: 'Negative' },
    neutral: { variant: 'neutral', label: 'Neutral' },
  };
  const normalized = (sentiment || 'neutral').toLowerCase();
  const { variant, label } = map[normalized] || { variant: 'neutral', label: sentiment || 'Neutral' };
  return <Badge variant={variant}>{label}</Badge>;
}

export function StatusBadge({ status }: { status?: FeedbackStatus | string }) {
  const map: Record<string, { variant: 'default' | 'info' | 'warning' | 'success' | 'ai'; label: string }> = {
    submitted: { variant: 'default', label: 'Submitted' },
    new: { variant: 'default', label: 'New' },
    received: { variant: 'default', label: 'Received' },
    under_review: { variant: 'info', label: 'Under Review' },
    action_planned: { variant: 'ai', label: 'Action Planned' },
    in_progress: { variant: 'warning', label: 'In Progress' },
    action_taken: { variant: 'ai', label: 'Action Taken' },
    resolved: { variant: 'success', label: 'Resolved' },
    closed: { variant: 'default', label: 'Closed' },
    escalated: { variant: 'warning', label: 'Escalated' },
  };
  const normalized = (status || '').toLowerCase();
  const config = map[normalized] || {
    variant: 'default',
    label: (status || 'Received').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
  };
  const { variant, label } = config;
  return <Badge variant={variant}>{label}</Badge>;
}

export function Button({ children, onClick, variant = 'primary', size = 'md', className = '', type = 'button', disabled = false }: { children: ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'ai'; size?: 'sm' | 'md' | 'lg'; className?: string; type?: 'button' | 'submit'; disabled?: boolean }) {
  const variants: Record<string, string> = {
    primary: 'bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 hover:from-cyan-400 hover:via-blue-500 hover:to-violet-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.25)] border border-cyan-400/30',
    secondary: 'bg-white/[0.08] text-slate-100 hover:bg-white/[0.15] border border-white/10',
    ghost: 'hover:bg-white/[0.08] text-slate-300 hover:text-white',
    outline: 'border border-white/15 hover:bg-white/[0.08] text-slate-200 hover:border-white/30',
    ai: 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] border border-violet-400/30',
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
    <div className={`h-2 rounded-full bg-slate-800/80 border border-white/5 overflow-hidden ${className}`}>
      <div className={`h-full rounded-full transition-all duration-700 ease-out ${colors[color]}`} style={{ width: `${percent}%` }} />
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-800/60 ${className}`} />;
}

export function EmptyState({ icon, title, message, actionLabel, onAction }: { icon?: ReactNode; title: string; message: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="mb-4 text-slate-500">{icon}</div>}
      <h3 className="text-lg font-semibold text-slate-200 mb-2">{title}</h3>
      <p className="text-sm text-slate-400 max-w-md mb-4">{message}</p>
      {actionLabel && onAction && (
        <Button variant="outline" onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );
}
