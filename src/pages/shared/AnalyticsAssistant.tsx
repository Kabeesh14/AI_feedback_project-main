import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Badge } from '@/components/common/UI';
import { AIBadge } from '@/components/common/AIExplainer';
import { answerAnalyticsQuestion } from '@/services/aiService';
import { Sparkles, Send, TrendingUp, AlertTriangle, Clock, CheckCircle, HelpCircle, ChevronRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type { ChatMessage, Role } from '@/types';

const suggestedQuestions = [
  'What are today\'s biggest concerns?',
  'Which department has the highest negative feedback?',
  'Why are students unhappy with the laboratories?',
  'Which issue increased the most this week?',
  'Which actions are overdue?',
  'Did Wi-Fi complaints improve after the intervention?',
];

export function AnalyticsAssistant({ role }: { role: Role }) {
  const { user } = useAuth();
  const effectiveDept = role === 'hod' ? user?.department : (user?.department || undefined);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-init',
      role: 'assistant',
      content: `Hello! I'm your AI analytics assistant${effectiveDept ? ` for ${effectiveDept}` : ''}. Ask me anything about ${effectiveDept ? effectiveDept : 'institutional'} feedback, issues, departments, or action effectiveness. You can start with one of the suggested questions below.`,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const handleAsk = (question: string) => {
    if (!question.trim()) return;
    const userMsg: ChatMessage = { id: `msg-${Date.now()}`, role: 'user', content: question, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    setTimeout(() => {
      const response = answerAnalyticsQuestion(question, effectiveDept);
      const aiMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: response.answer,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, { ...aiMsg, content: JSON.stringify({ text: response.answer, metrics: response.metrics, relatedIssue: response.relatedIssue }) }]);
      setTyping(false);
    }, 1500);
  };

  const renderMessage = (msg: ChatMessage) => {
    if (msg.role === 'user') {
      return (
        <div key={msg.id} className="flex justify-end">
          <div className="max-w-[80%] px-4 py-2.5 rounded-2xl bg-blue-600 text-white rounded-tr-sm text-sm">
            {msg.content}
          </div>
        </div>
      );
    }

    let parsed: { text: string; metrics: { label: string; value: string }[]; relatedIssue?: string } | null = null;
    try {
      parsed = JSON.parse(msg.content);
    } catch {
      parsed = { text: msg.content, metrics: [] };
    }

    if (!parsed) return null;

    return (
      <div key={msg.id} className="flex justify-start">
        <div className="flex gap-2 max-w-[85%]">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center flex-shrink-0">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <div className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-200 rounded-tl-sm text-sm">
              {parsed.text.split('\n').map((line, i) => <p key={i} className={line === '' ? 'h-2' : ''}>{line}</p>)}
            </div>
            {parsed.metrics.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {parsed.metrics.map((m, i) => (
                  <div key={i} className="px-3 py-2 rounded-xl bg-white dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-400">{m.label}</p>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{m.value}</p>
                  </div>
                ))}
              </div>
            )}
            {parsed.relatedIssue && (
              <button onClick={() => navigate(`/${role}/issues`)} className="flex items-center gap-1 mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline">
                View related issue: {parsed.relatedIssue}
                <ChevronRight size={12} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <AIBadge>AI Powered</AIBadge>
          <span className="text-xs text-slate-400">Demo Data</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Ask FeedbackIQ</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Ask questions about {effectiveDept ? `${effectiveDept} feedback, issues, and action effectiveness` : 'institutional feedback, issues, and action effectiveness'}
        </p>
      </div>

      <Card className="flex flex-col h-[600px] overflow-hidden">
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map(renderMessage)}
          {typing && (
            <div className="flex justify-start">
              <div className="flex gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
                  <Sparkles size={16} className="text-white" />
                </div>
                <div className="px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-700/50 rounded-tl-sm">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested questions */}
        {messages.length <= 2 && (
          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-400 mb-2 flex items-center gap-1"><HelpCircle size={12} /> Suggested questions</p>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map(q => (
                <button key={q} onClick={() => handleAsk(q)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 transition-all">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAsk(input)} placeholder="Ask about feedback, issues, departments..." className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:bg-white dark:focus:bg-slate-700 transition-all text-sm" />
            <Button variant="ai" size="sm" onClick={() => handleAsk(input)} disabled={!input.trim()}>
              <Send size={16} />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
