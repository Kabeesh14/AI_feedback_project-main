import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Badge } from '@/components/common/UI';
import { AIBadge } from '@/components/common/AIExplainer';
import { addFeedback } from '@/services/feedbackService';
import { Sparkles, Send, User, CheckCircle, ArrowRight } from 'lucide-react';
import type { ChatMessage, Category } from '@/types';

const conversationFlows: { keywords: string[]; replies: { content: string; quickReplies?: string[] }[] }[] = [
  {
    keywords: ['transport', 'bus', 'timing'],
    replies: [
      { content: "What part of the timing is causing difficulty?", quickReplies: ['Too Early', 'Too Late', 'Not Enough Buses', 'Irregular Timing', 'Route Problem'] },
      { content: "How often does this happen?", quickReplies: ['Rarely', 'Sometimes', 'Frequently', 'Almost Every Day'] },
      { content: "Thank you for the details. I've structured your feedback:\n\nCategory: Transport\nIssue: Bus Timing\nSentiment: Negative\n\nWould you like to submit this feedback?", quickReplies: ['Yes, submit', 'Send to feedback form', 'Add more details'] },
    ],
  },
  {
    keywords: ['lab', 'laboratory', 'computer', 'pc', 'system'],
    replies: [
      { content: "I can help make your feedback more specific. What is the main issue with the laboratory?", quickReplies: ['Slow Computers', 'Missing Software', 'Network Problems', 'Equipment', 'Technical Assistance', 'Other'] },
      { content: "How frequently does this happen?", quickReplies: ['Rarely', 'Sometimes', 'Frequently', 'Almost Every Session'] },
      { content: "Your feedback has been structured:\n\nCategory: Laboratory\nIssue: Slow Computers\nSentiment: Negative\nSeverity: High\n\nWould you like to submit this feedback?", quickReplies: ['Yes, submit', 'Send to feedback form', 'Add more details'] },
    ],
  },
  {
    keywords: ['wifi', 'internet', 'network', 'connect'],
    replies: [
      { content: "I understand you're having internet issues. Can you tell me more about what happens?", quickReplies: ['Slow Speed', 'Frequent Disconnection', 'No Access', 'Weak Signal'] },
      { content: "When does this usually happen?", quickReplies: ['During practical sessions', 'Peak hours', 'All day', 'Random times'] },
      { content: "Your feedback has been structured:\n\nCategory: Internet\nIssue: Laboratory Wi-Fi\nSentiment: Negative\nSeverity: Critical\n\nWould you like to submit this feedback?", quickReplies: ['Yes, submit', 'Send to feedback form', 'Add more details'] },
    ],
  },
  {
    keywords: ['hostel', 'water', 'room', 'clean'],
    replies: [
      { content: "What specific issue are you facing in the hostel?", quickReplies: ['Water Supply', 'Cleanliness', 'Maintenance', 'Food', 'Safety'] },
      { content: "How frequently does this happen?", quickReplies: ['Rarely', 'Sometimes', 'Frequently', 'Every Day'] },
      { content: "Your feedback has been structured:\n\nCategory: Hostel\nIssue: Hostel Water Supply\nSentiment: Negative\nSeverity: Critical\n\nWould you like to submit this feedback?", quickReplies: ['Yes, submit', 'Send to feedback form', 'Add more details'] },
    ],
  },
  {
    keywords: ['canteen', 'food', 'meal'],
    replies: [
      { content: "What aspect of the canteen needs improvement?", quickReplies: ['Food Quality', 'Hygiene', 'Pricing', 'Variety', 'Service'] },
      { content: "How often do you experience this issue?", quickReplies: ['Rarely', 'Sometimes', 'Frequently', 'Always'] },
      { content: "Your feedback has been structured:\n\nCategory: Canteen\nIssue: Canteen Food Quality\nSentiment: Negative\nSeverity: Medium\n\nWould you like to submit this feedback?", quickReplies: ['Yes, submit', 'Send to feedback form', 'Add more details'] },
    ],
  },
];

const defaultFlow = {
  keywords: [],
  replies: [
    { content: "I'd like to help you give specific, actionable feedback. What would you like to report?", quickReplies: ['Teaching', 'Laboratory', 'Internet', 'Hostel', 'Canteen', 'Transport', 'Other'] },
    { content: "Can you describe what specifically is the issue?", quickReplies: ['Quality issue', 'Timing problem', 'Availability', 'Maintenance', 'Other'] },
    { content: "How frequently does this happen?", quickReplies: ['Rarely', 'Sometimes', 'Frequently', 'Always'] },
    { content: "Your feedback has been structured. Would you like to submit it?", quickReplies: ['Yes, submit', 'Send to feedback form', 'Add more details'] },
  ],
};

import { useAuth } from '@/context/AuthContext';

export function StudentAIAssistant() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      role: 'assistant',
      content: "Hi! I'm your Feedback Assistant. I help you turn vague feedback into specific, actionable insights that your HOD can act on. What would you like to report?",
      timestamp: new Date().toISOString(),
      quickReplies: ['The lab internet is very slow during practical sessions', 'Transport timing is bad', 'Hostel water issue', 'Canteen food quality'],
    },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [flowIndex, setFlowIndex] = useState(0);
  const [activeFlow, setActiveFlow] = useState<(typeof conversationFlows)[number] | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const handleSend = (text: string) => {
    if (!text.trim()) return;

    if (text === 'Send to feedback form') {
      const cat = activeFlow?.keywords[0] === 'lab' ? 'Laboratory' : activeFlow?.keywords[0] === 'wifi' ? 'Internet' : 'Laboratory';
      navigate('/student/feedback', { state: { category: cat, emotion: 'Poor' } });
      return;
    }

    if (text === 'Yes, submit') {
      const studentDept = user?.department || 'Artificial Intelligence & Data Science';
      addFeedback({
        date: new Date().toISOString(),
        department: studentDept,
        year: '3rd Year',
        category: (activeFlow?.keywords[0] === 'wifi' ? 'Internet' : activeFlow?.keywords[0] === 'lab' ? 'Laboratory' : 'Laboratory') as Category,
        comment: 'Submitted via AI Feedback Assistant: ' + (activeFlow?.keywords[0] === 'wifi' ? 'Lab internet is very slow during practical sessions.' : 'Laboratory systems require attention.'),
        sentiment: 'negative',
        theme: activeFlow?.keywords[0] === 'wifi' ? 'Internet' : 'Laboratory',
        issue: activeFlow?.keywords[0] === 'wifi' ? 'Laboratory Wi-Fi' : 'Slow Laboratory Computers',
        severity: activeFlow?.keywords[0] === 'wifi' ? 'critical' : 'high',
        status: 'received',
        anonymous: true,
        studentId: 'ANONYMOUS',
      });
      const userMsg: ChatMessage = { id: `msg-${Date.now()}`, role: 'user', content: text, timestamp: new Date().toISOString() };
      setMessages(prev => [
        ...prev,
        userMsg,
        {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: "🎉 Feedback submitted successfully! Your feedback has been categorized and sent to the HOD command center. You can track its journey in your Feedback History.",
          timestamp: new Date().toISOString(),
          quickReplies: ['Go to Feedback History', 'Submit another feedback'],
        },
      ]);
      return;
    }

    if (text === 'Go to Feedback History') {
      navigate('/student/history');
      return;
    }

    if (text === 'Submit another feedback') {
      setActiveFlow(null);
      setFlowIndex(0);
      setMessages([
        {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: "What else would you like to give feedback on?",
          timestamp: new Date().toISOString(),
          quickReplies: ['Teaching', 'Laboratory', 'Internet', 'Hostel', 'Canteen', 'Transport'],
        },
      ]);
      return;
    }

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    if (!activeFlow) {
      const matched = conversationFlows.find(f => f.keywords.some(k => text.toLowerCase().includes(k)));
      const flow = matched || defaultFlow;
      setActiveFlow(flow);
      setFlowIndex(0);
    }

    setTimeout(() => {
      const flow = activeFlow || conversationFlows.find(f => f.keywords.some(k => text.toLowerCase().includes(k))) || defaultFlow;
      const reply = flow.replies[flowIndex] || flow.replies[flow.replies.length - 1];
      const aiMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: reply.content,
        timestamp: new Date().toISOString(),
        quickReplies: reply.quickReplies,
      };
      setMessages(prev => [...prev, aiMsg]);
      setTyping(false);
      setFlowIndex(prev => prev + 1);
    }, 800);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <AIBadge>AI Powered</AIBadge>
          <span className="text-xs text-slate-400">Demo Data</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Feedback Assistant</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Transform unstructured feedback into structured, actionable insights</p>
      </div>

      <Card className="flex flex-col h-[600px] overflow-hidden">
        {/* Chat header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-200 dark:border-slate-700">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shadow-sm">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Feedback Assistant</p>
            <p className="text-xs text-emerald-500 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Online
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex gap-2 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'user' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gradient-to-br from-violet-500 to-blue-500'
                }`}>
                  {msg.role === 'user' ? <User size={16} className="text-blue-600 dark:text-blue-400" /> : <Sparkles size={16} className="text-white" />}
                </div>
                <div>
                  <div className={`px-4 py-2.5 rounded-2xl text-sm ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-sm'
                      : 'bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-200 rounded-tl-sm'
                  }`}>
                    {msg.content.split('\n').map((line, i) => <p key={i} className={line === '' ? 'h-2' : ''}>{line}</p>)}
                  </div>
                  {msg.quickReplies && msg.quickReplies.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {msg.quickReplies.map(qr => (
                        <button
                          key={qr}
                          onClick={() => handleSend(qr)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 transition-all"
                        >
                          {qr}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
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

        {/* Input */}
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend(input)}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:bg-white dark:focus:bg-slate-700 transition-all text-sm"
            />
            <Button variant="ai" size="sm" onClick={() => handleSend(input)} disabled={!input.trim()}>
              <Send size={16} />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
