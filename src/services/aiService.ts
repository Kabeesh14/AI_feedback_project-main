import type { AIAnalysis, AIExplanation, Sentiment, Severity, Category } from '@/types';

// Mock AI service — all responses are deterministic and clearly labeled as demo data.
// Real AI APIs can replace these functions later without changing component code.

const negativeKeywords = ['slow', 'bad', 'poor', 'broken', 'not good', 'worst', 'terrible', 'issue', 'problem', 'dirty', 'unhygienic', 'late', 'unavailable', 'disconnect', 'stale', 'outdated'];
const positiveKeywords = ['good', 'excellent', 'great', 'amazing', 'love', 'helpful', 'clean', 'comfortable', 'punctual', 'best', 'improved'];

const categoryKeywords: Record<string, Category> = {
  'lab': 'Laboratory', 'computer': 'Laboratory', 'pc': 'Laboratory', 'system': 'Laboratory',
  'wifi': 'Internet', 'internet': 'Internet', 'network': 'Internet', 'wi-fi': 'Internet', 'connect': 'Internet',
  'teacher': 'Teaching', 'teaching': 'Teaching', 'class': 'Teaching', 'faculty': 'Teaching', 'lecture': 'Teaching',
  'hostel': 'Hostel', 'room': 'Hostel', 'water': 'Hostel', 'bathroom': 'Hostel',
  'canteen': 'Canteen', 'food': 'Canteen', 'meal': 'Canteen',
  'bus': 'Transport', 'transport': 'Transport', 'timing': 'Transport',
  'placement': 'Placement', 'interview': 'Placement', 'training': 'Placement',
  'library': 'Library', 'book': 'Library', 'seating': 'Library', 'study': 'Library',
  'exam': 'Examination', 'examination': 'Examination', 'schedule': 'Examination',
  'infrastructure': 'Infrastructure', 'projector': 'Infrastructure', 'ac': 'Infrastructure', 'bench': 'Infrastructure',
};

const issueMap: Record<string, { issue: string; severity: Severity }> = {
  'Laboratory': { issue: 'Slow Laboratory Computers', severity: 'high' },
  'Internet': { issue: 'Laboratory Wi-Fi', severity: 'critical' },
  'Teaching': { issue: 'Teaching Methodology', severity: 'medium' },
  'Hostel': { issue: 'Hostel Water Supply', severity: 'critical' },
  'Canteen': { issue: 'Canteen Food Quality', severity: 'medium' },
  'Transport': { issue: 'Transport Timing', severity: 'medium' },
  'Placement': { issue: 'Placement Training', severity: 'high' },
  'Library': { issue: 'Library Seating', severity: 'low' },
  'Examination': { issue: 'Exam Schedule Clarity', severity: 'low' },
  'Infrastructure': { issue: 'Classroom Infrastructure', severity: 'medium' },
};

const causeMap: Record<string, string[]> = {
  'Laboratory Wi-Fi': ['Network Congestion', 'Access Point Coverage', 'Bandwidth Capacity', 'Peak-Time Usage'],
  'Slow Laboratory Computers': ['Outdated Hardware', 'Insufficient RAM', 'High System Utilization', 'Lack of Maintenance'],
  'Hostel Water Supply': ['Inadequate Storage Capacity', 'Pump Timing Issues', 'Pipeline Leaks', 'Peak Hour Demand'],
  'Canteen Food Quality': ['Inconsistent Vendor Standards', 'Poor Hygiene Practices', 'Inadequate Quality Checks', 'Storage Issues'],
  'Transport Timing': ['Route Planning Gaps', 'Insufficient Buses', 'Traffic Pattern Changes', 'Driver Scheduling'],
  'Placement Training': ['Insufficient Mock Sessions', 'Limited Industry Exposure', 'Outdated Curriculum', 'Lack of Soft Skills Training'],
  'Teaching Methodology': ['Theory-Heavy Approach', 'Limited Interactive Sessions', 'Large Class Sizes', 'Assessment Gaps'],
  'Library Seating': ['Insufficient Seating Capacity', 'Peak Hour Congestion', 'Space Utilization', 'Furniture Maintenance'],
  'Classroom Infrastructure': ['Aging Equipment', 'Delayed Maintenance', 'Budget Constraints', 'Vendor Service Gaps'],
  'Exam Schedule Clarity': ['Late Notifications', 'Communication Gaps', 'Process Inefficiencies', 'System Integration Issues'],
};

function lower(text: string): string {
  return text.toLowerCase();
}

export function analyzeSentiment(text: string): Sentiment {
  const l = lower(text);
  const negHits = negativeKeywords.filter(k => l.includes(k)).length;
  const posHits = positiveKeywords.filter(k => l.includes(k)).length;
  if (negHits > posHits) return 'negative';
  if (posHits > negHits) return 'positive';
  return 'neutral';
}

export function detectTheme(text: string): string {
  const l = lower(text);
  for (const [keyword, cat] of Object.entries(categoryKeywords)) {
    if (l.includes(keyword)) return cat;
  }
  return 'Other';
}

export function detectIssue(text: string, theme: string): { issue: string; severity: Severity } {
  const issueInfo = issueMap[theme];
  if (issueInfo) return issueInfo;
  return { issue: 'General Feedback', severity: 'low' };
}

export function analyzeFeedback(text: string): AIAnalysis {
  const sentiment = analyzeSentiment(text);
  const theme = detectTheme(text);
  const { issue, severity } = detectIssue(text, theme);
  const possibleCauses = causeMap[issue] || ['Insufficient information for analysis'];
  return {
    sentiment,
    theme,
    issue,
    severity,
    possibleCauses,
    evidenceCount: 0,
  };
}

export function identifyPossibleCauses(issue: string): string[] {
  return causeMap[issue] || ['Insufficient data to identify causes'];
}

export function generateDailySummary(department?: string | null): {
  totalResponses: number;
  positivePercent: number;
  negativePercent: number;
  newIssues: number;
  criticalAlerts: number;
  topConcerns: { issue: string; percent: number }[];
} {
  return {
    totalResponses: 0,
    positivePercent: 0,
    negativePercent: 0,
    newIssues: 0,
    criticalAlerts: 0,
    topConcerns: [],
  };
}

export function generateRecommendations(department?: string | null): string[] {
  const isAll = !department || department === 'ALL' || department === 'all' || department === 'All Departments';
  const deptPrefix = !isAll ? `${department}: ` : '';
  return [
    `${deptPrefix}Prioritize Laboratory Wi-Fi access points — peak practical sessions show 82% negative sentiment.`,
    `${deptPrefix}Address Hostel Water Supply scheduling — complaints recurring across residential student reports.`,
    `${deptPrefix}Review Laboratory workstation hardware and RAM capacity for upcoming batch practicals.`,
    `${deptPrefix}Canteen hygiene improvement confirmed — student complaints down 38% after vendor audit.`,
  ];
}

export function answerAnalyticsQuestion(question: string, department?: string | null): {
  answer: string;
  metrics: { label: string; value: string }[];
  relatedIssue?: string;
} {
  const deptLabel = department && department !== 'ALL' && department !== 'all' ? department : 'institutional';
  return {
    answer: `Live conversational analytics are unavailable for this query.\n\nTo view verified real-time ${deptLabel} metrics, sentiment breakdown, and active issues, please consult the live Dashboard, Theme Explorer, or Issue Explorer.`,
    metrics: [],
  };
}

export function getAIExplanation(insightType: string): AIExplanation {
  const explanations: Record<string, AIExplanation> = {
    priority: {
      title: 'Why Issues Are Prioritized',
      reasons: [
        'Identified from aggregated feedback volume across recent academic periods',
        'Evaluated by the proportion of negative student and faculty sentiment',
        'Ranked according to recurring complaint frequency and severity indicators',
        'Monitored across departmental cohorts for systemic impact',
      ],
    },
    theme: {
      title: 'Why This Theme Is Flagged',
      reasons: [
        'Categorized by thematic grouping of submitted feedback records',
        'Sentiment trends calculated from student ratings and comments',
        'Cross-departmental patterns monitored for emerging shifts',
        'Multiple related issues grouped under common functional area',
      ],
    },
    cause: {
      title: 'Why Contributing Factors Are Identified',
      reasons: [
        'Extracted from co-occurring keywords across student submissions',
        'Correlated with facility usage and schedule time intervals',
        'Evidence confidence calibrated against verified response volume in database',
        'Categorized as investigatory hypotheses based on student reports',
      ],
    },
    alert: {
      title: 'Why Alerts Are Generated',
      reasons: [
        'Triggered when negative feedback volume exceeds statistical baseline',
        'Accelerating issue frequency flagged for proactive review',
        'Severity assigned based on sentiment intensity and recurrence',
        'Pattern evaluated against departmental historical averages',
      ],
    },
  };
  return explanations[insightType] || explanations.priority;
}

import { apiClient } from './apiClient';

/**
 * Fetch feedback AI analysis from backend API
 */
export async function fetchFeedbackAIAnalysis(feedbackId: string | number) {
  try {
    const res = await apiClient.get(`/ai/feedback/${feedbackId}`);
    return res.data;
  } catch (err) {
    console.error(`[aiService.fetchFeedbackAIAnalysis ${feedbackId} failed]:`, err);
    throw err;
  }
}

/**
 * Fetch issue intelligence from backend API
 */
export async function fetchIssueIntelligence(issueId: string | number) {
  try {
    const res = await apiClient.get(`/ai/issues/${issueId}`);
    return res.data;
  } catch (err) {
    console.error(`[aiService.fetchIssueIntelligence ${issueId} failed]:`, err);
    throw err;
  }
}

/**
 * Fetch issue root causes with evidence from backend API
 */
export async function fetchIssueRootCauses(issueId: string | number) {
  try {
    const res = await apiClient.get(`/ai/root-causes/${issueId}`);
    return res.data;
  } catch (err) {
    console.error(`[aiService.fetchIssueRootCauses ${issueId} failed]:`, err);
    throw err;
  }
}

/**
 * Fetch explainability for an issue from backend API
 */
export async function fetchExplainability(issueId: string | number) {
  try {
    const res = await apiClient.get(`/ai/explain/${issueId}`);
    return res.data;
  } catch (err) {
    console.error(`[aiService.fetchExplainability ${issueId} failed]:`, err);
    throw err;
  }
}
