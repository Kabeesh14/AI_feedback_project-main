import { useState, useEffect } from 'react';
import type { Feedback, Action } from '@/types';
import { createAction, fetchBusIncharge } from '@/services/actionService';
import { normalizeBusNumber, formatBusDisplay } from '@/utils/busUtils';
import {
  X,
  CheckSquare,
  Bus,
  User,
  AlertCircle,
  Clock,
  Loader2,
  Lock,
  MessageSquare,
  Sparkles,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/common/UI';

interface RequiredActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  feedback: Feedback | null;
  onActionCreated?: (newAction: Action) => void;
}

export function RequiredActionModal({
  isOpen,
  onClose,
  feedback,
  onActionCreated
}: RequiredActionModalProps) {
  const [requiredActionText, setRequiredActionText] = useState('');
  const [busInchargeName, setBusInchargeName] = useState('');
  const [status, setStatus] = useState<'pending' | 'planned' | 'in_progress' | 'completed'>('pending');
  const [loadingIncharge, setLoadingIncharge] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successAction, setSuccessAction] = useState<Action | null>(null);

  // Derived fields from feedback
  const rawBusNumber = feedback?.bus_number || '';
  const coreBusNumber = normalizeBusNumber(rawBusNumber) || rawBusNumber;
  const originalIssue = feedback?.comment || '';

  useEffect(() => {
    if (isOpen && feedback) {
      setRequiredActionText('');
      setStatus('pending');
      setError(null);
      setSuccessAction(null);
      setLoadingIncharge(true);

      const busQuery = coreBusNumber || rawBusNumber;
      if (busQuery) {
        fetchBusIncharge(busQuery)
          .then((res) => {
            setBusInchargeName(res.name || `Bus ${coreBusNumber} Incharge`);
          })
          .catch(() => {
            setBusInchargeName(`Bus ${coreBusNumber} Incharge`);
          })
          .finally(() => {
            setLoadingIncharge(false);
          });
      } else {
        setBusInchargeName('Fleet Maintenance / Unassigned');
        setLoadingIncharge(false);
      }
    }
  }, [isOpen, feedback, coreBusNumber, rawBusNumber]);

  if (!isOpen || !feedback) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requiredActionText.trim() || requiredActionText.trim().length < 3) {
      setError('Please provide a specific Required Action (at least 3 characters).');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Default target deadline: 7 days from today
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 7);
      const deadlineStr = targetDate.toISOString().split('T')[0];

      const newAction = await createAction({
        action: requiredActionText.trim(),
        title: requiredActionText.trim(),
        description: `Issue: ${originalIssue.trim()}`,
        bus_number: coreBusNumber,
        portal: 'bus',
        assignedTo: busInchargeName || `Bus ${coreBusNumber} Incharge`,
        status,
        priority: feedback.severity === 'critical' ? 'critical' : feedback.severity === 'high' ? 'high' : 'medium',
        deadline: deadlineStr,
        issueId: feedback.issue_id ? String(feedback.issue_id) : undefined,
        notes: `Created from Bus Feedback #${feedback.id} (${feedback.category})`,
        feedbackId: feedback.id ? Number(feedback.id) : undefined
      } as any);

      setSuccessAction(newAction);
      if (onActionCreated) {
        onActionCreated(newAction);
      }
    } catch (err: any) {
      console.error('[RequiredActionModal] Submit failed:', err);
      setError(err.message || 'Failed to create corrective action.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-amber-500/30 p-6 md:p-8 shadow-[0_0_50px_rgba(245,158,11,0.2)] text-white max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {successAction ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
              <ShieldCheck size={32} />
            </div>
            <h2 className="text-xl font-bold text-white">Required Action Created!</h2>
            <p className="text-sm text-slate-300 max-w-sm mx-auto">
              Corrective action for <span className="font-semibold text-amber-400">{formatBusDisplay(coreBusNumber)}</span> has been registered and assigned to <span className="font-semibold text-white">{busInchargeName}</span>.
            </p>
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 text-left text-xs space-y-1.5">
              <div className="flex justify-between text-slate-400">
                <span>Action:</span>
                <span className="text-white font-medium">{successAction.action}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Assigned To:</span>
                <span className="text-amber-300 font-medium">{successAction.assignedTo}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Status:</span>
                <span className="capitalize text-emerald-400 font-semibold">{successAction.status}</span>
              </div>
            </div>
            <div className="pt-2 flex justify-center gap-3">
              <Button
                variant="secondary"
                onClick={onClose}
                className="px-5"
              >
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div>
            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                <CheckSquare size={22} />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                  <span>Required Action</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {formatBusDisplay(coreBusNumber)}
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Assign corrective transport operations to the responsible Bus Incharge.
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Field 1: Bus Number (Auto-filled, Read-only) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Bus size={13} className="text-amber-400" />
                    1. Bus Number
                  </span>
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Lock size={10} /> Auto-filled
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={coreBusNumber}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-sm cursor-not-allowed select-none focus:outline-none focus:ring-0"
                    id="required-action-bus-number"
                  />
                  <div className="absolute right-3 top-2.5 text-xs text-amber-400 font-semibold font-mono">
                    {formatBusDisplay(coreBusNumber)}
                  </div>
                </div>
              </div>

              {/* Field 2: Issue (Auto-filled, Read-only) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <MessageSquare size={13} className="text-amber-400" />
                    2. Original Issue / Feedback
                  </span>
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Lock size={10} /> Auto-filled
                  </span>
                </label>
                <textarea
                  readOnly
                  rows={2}
                  value={originalIssue}
                  className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-slate-300 text-xs leading-relaxed cursor-not-allowed select-none focus:outline-none focus:ring-0 resize-none"
                  id="required-action-issue"
                />
              </div>

              {/* Field 3: Required Action (Textarea, User Input) */}
              <div>
                <label htmlFor="required-action-text" className="block text-xs font-semibold text-amber-300 mb-1.5 flex items-center gap-1.5">
                  <Sparkles size={13} className="text-amber-400" />
                  3. Required Action <span className="text-rose-400">*</span>
                </label>
                <textarea
                  id="required-action-text"
                  required
                  rows={3}
                  value={requiredActionText}
                  onChange={(e) => setRequiredActionText(e.target.value)}
                  placeholder="e.g. Add additional seats / inspect seating capacity, adjust morning shift timing, or service air conditioning..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-amber-500/30 text-white text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 transition-all placeholder:text-slate-500"
                />
              </div>

              {/* Field 4: Bus Incharge Name (Auto-populated from account, Read-only) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <User size={13} className="text-amber-400" />
                    4. Bus Incharge Name
                  </span>
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Lock size={10} /> Auto-assigned
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={loadingIncharge ? 'Resolving assigned incharge...' : busInchargeName}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm cursor-not-allowed select-none focus:outline-none focus:ring-0 font-medium"
                    id="required-action-incharge-name"
                  />
                  {loadingIncharge && (
                    <div className="absolute right-3 top-2.5 text-amber-400 animate-spin">
                      <Loader2 size={16} />
                    </div>
                  )}
                </div>
              </div>

              {/* Field 5: Status (Selector with existing Bus Action status values) */}
              <div>
                <label htmlFor="required-action-status" className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Clock size={13} className="text-amber-400" />
                  5. Status
                </label>
                <select
                  id="required-action-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-white/15 text-white text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 transition-all"
                >
                  <option value="pending">Pending</option>
                  <option value="planned">Planned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/10">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <button
                  type="submit"
                  disabled={isSubmitting || !requiredActionText.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  id="required-action-submit-btn"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Saving Action...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Action</span>
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
