import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Badge, Button } from '@/components/common/UI';
import { AIExplainer, AIBadge } from '@/components/common/AIExplainer';
import { getAllIssues, getPossibleCauses } from '@/services/issueService';
import { GitBranch, ChevronRight, AlertTriangle, X, Check } from 'lucide-react';
import type { Role, PossibleCause } from '@/types';
import { useAuth } from '@/context/AuthContext';

const confidenceConfig: Record<string, { label: string; variant: 'positive' | 'warning' | 'neutral' }> = {
  high: { label: 'High', variant: 'positive' },
  moderate: { label: 'Moderate', variant: 'warning' },
  low: { label: 'Low', variant: 'neutral' },
};

export function RootCauseExplorer({ role }: { role: Role }) {
  const { user } = useAuth();
  const effectiveDept = role === 'hod' ? user?.department : (user?.department || undefined);
  const issues = getAllIssues(effectiveDept);
  const navigate = useNavigate();
  const [selectedIssue, setSelectedIssue] = useState(issues[0] || null);
  const [selectedCause, setSelectedCause] = useState<PossibleCause | null>(null);

  useEffect(() => {
    const updated = getAllIssues(effectiveDept);
    setSelectedIssue(updated[0] || null);
    setSelectedCause(null);
  }, [effectiveDept]);

  const causes = selectedIssue ? getPossibleCauses(selectedIssue.title) : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Root-Cause Explorer</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            AI-supported hypothesis identification with evidence from feedback {effectiveDept ? `· ${effectiveDept}` : '· Institution-wide'}
          </p>
        </div>
        <AIExplainer insightType="cause" />
      </div>

      {/* Issue selector */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        {issues.map(issue => (
          <button
            key={issue.id}
            onClick={() => { setSelectedIssue(issue); setSelectedCause(null); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              selectedIssue && selectedIssue.id === issue.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            {issue.title}
          </button>
        ))}
      </div>

      {selectedIssue && (
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Issue + Causes tree */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            {/* Issue node */}
            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-md">
                <AlertTriangle size={22} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Issue</p>
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{selectedIssue.title}</h2>
              </div>
            </div>

            {/* Connector */}
            <div className="ml-6 h-6 w-px bg-slate-200 dark:bg-slate-700" />

            {/* Causes */}
            <div className="ml-3 pl-6 border-l-2 border-dashed border-slate-200 dark:border-slate-700 space-y-3">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-2 -ml-6">Possible Contributing Factors</p>
              {causes.map((cause, i) => (
                <div key={cause.id}>
                  <button
                    onClick={() => setSelectedCause(cause)}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all duration-200 text-left ${
                      selectedCause?.id === cause.id
                        ? 'bg-violet-50 dark:bg-violet-900/20 border border-violet-300 dark:border-violet-700 shadow-md'
                        : 'bg-white dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700 hover:border-violet-200 dark:hover:border-violet-700'
                    }`}
                  >
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${selectedCause?.id === cause.id ? 'bg-violet-500' : 'bg-slate-200 dark:bg-slate-600'}`}>
                      <GitBranch size={16} className={selectedCause?.id === cause.id ? 'text-white' : 'text-slate-500'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{cause.factor}</p>
                      <p className="text-xs text-slate-400">{cause.relatedFeedbackCount} supporting responses</p>
                    </div>
                    <Badge variant={confidenceConfig[cause.confidence].variant}>
                      {confidenceConfig[cause.confidence].label}
                    </Badge>
                    <ChevronRight size={16} className="text-slate-300" />
                  </button>
                  {i < causes.length - 1 && <div className="h-3 w-px bg-slate-200 dark:bg-slate-700 ml-4" />}
                </div>
              ))}
            </div>

            {/* Disclaimer */}
            <div className="mt-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50">
              <p className="text-xs text-amber-700 dark:text-amber-300">
                <strong>Academic Note:</strong> These factors are AI-supported hypotheses based on feedback evidence, not scientifically proven root causes. They represent patterns detected in student responses and should be validated through further investigation.
              </p>
            </div>
          </Card>
        </div>

        {/* Evidence panel */}
        <div>
          <Card className="p-5 sticky top-20">
            {selectedCause ? (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <AIBadge>AI Hypothesis</AIBadge>
                  <Badge variant={confidenceConfig[selectedCause.confidence].variant}>
                    Evidence: {confidenceConfig[selectedCause.confidence].label}
                  </Badge>
                </div>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">Possible contributing factor:</h3>
                <p className="text-base font-medium text-violet-600 dark:text-violet-400 mb-4">"{selectedCause.factor}"</p>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Related Feedback</p>
                    <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{selectedCause.relatedFeedbackCount} responses</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400 mb-2">Supporting Keywords</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedCause.supportingKeywords.map((kw, i) => (
                        <span key={i} className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/50 text-xs text-slate-600 dark:text-slate-300">{kw}</span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400 mb-2">Evidence Examples</p>
                    <div className="space-y-2">
                      {selectedCause.evidenceExamples.map((ex, i) => (
                        <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 text-sm text-slate-700 dark:text-slate-200">
                          "{ex}"
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-700/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-400">Evidence Strength</span>
                      <span className="text-xs font-medium capitalize text-slate-700 dark:text-slate-200">{selectedCause.confidence}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-700 ${selectedCause.confidence === 'high' ? 'w-full bg-emerald-500' : selectedCause.confidence === 'moderate' ? 'w-2/3 bg-amber-500' : 'w-1/3 bg-slate-400'}`} />
                    </div>
                  </div>

                  <Button variant="ai" size="sm" className="w-full" onClick={() => navigate(`/${role}/actions`)}>
                    Create Corrective Action
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <GitBranch size={40} className="text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-400">Select a possible contributing factor to view evidence</p>
              </div>
            )}
          </Card>
        </div>
      </div>
      )}
    </div>
  );
}
