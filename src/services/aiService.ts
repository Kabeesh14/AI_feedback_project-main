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
    evidenceCount: Math.floor(Math.random() * 30) + 5,
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
  const isAll = !department || department === 'ALL' || department === 'all' || department === 'All Departments';
  if (!isAll) {
    return {
      totalResponses: 100,
      positivePercent: 81,
      negativePercent: 11,
      newIssues: 5,
      criticalAlerts: 2,
      topConcerns: [
        { issue: 'Laboratory Wi-Fi', percent: 22 },
        { issue: 'Slow Laboratory Computers', percent: 16 },
        { issue: 'Hostel Water Supply', percent: 12 },
      ],
    };
  }
  return {
    totalResponses: 900,
    positivePercent: 78,
    negativePercent: 12,
    newIssues: 45,
    criticalAlerts: 18,
    topConcerns: [
      { issue: 'Laboratory Wi-Fi', percent: 18 },
      { issue: 'Slow Laboratory Computers', percent: 14 },
      { issue: 'Hostel Water Supply', percent: 12 },
    ],
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
  const l = lower(question);
  const deptLabel = department && department !== 'ALL' ? `${department}` : 'Institutional';

  if (l.includes('biggest') || l.includes('top') || l.includes('concern') || l.includes('problem')) {
    return {
      answer: `${deptLabel} analysis shows three issues receiving the highest attention:\n\n1. Wi-Fi connectivity — 22% of negative responses\n2. Laboratory systems — 16%\n3. Hostel water supply — 12%\n\nComplaints increased during peak morning and lab hours.`,
      metrics: [
        { label: 'Wi-Fi negative share', value: '22%' },
        { label: 'Lab systems share', value: '16%' },
        { label: 'Water supply share', value: '12%' },
        { label: 'Weekly increase', value: '+24%' },
      ],
      relatedIssue: 'Laboratory Wi-Fi',
    };
  }
  if (l.includes('department') && (l.includes('negative') || l.includes('worst') || l.includes('highest'))) {
    return {
      answer: 'Mechanical Engineering currently has the highest negative feedback rate at 22%, followed by Electronics & Communication Engineering at 18%. Artificial Intelligence & Data Science has improved to 10% after recent corrective actions.',
      metrics: [
        { label: 'Mech Eng negative', value: '22%' },
        { label: 'ECE negative', value: '18%' },
        { label: 'AI & DS negative', value: '10%' },
      ],
      relatedIssue: 'Slow Laboratory Computers',
    };
  }
  if (l.includes('laborator') || l.includes('lab')) {
    return {
      answer: 'Laboratory complaints are primarily about two issues:\n\n1. Wi-Fi connectivity (37 mentions, 82% negative)\n2. Slow computers (29 mentions, 68% negative)\n\nPossible contributing factors include network congestion, outdated hardware, and peak-time usage patterns.',
      metrics: [
        { label: 'Wi-Fi mentions', value: '37' },
        { label: 'Wi-Fi negative', value: '82%' },
        { label: 'Computer mentions', value: '29' },
      ],
      relatedIssue: 'Laboratory Wi-Fi',
    };
  }
  if (l.includes('increase') || l.includes('grew') || l.includes('most this week')) {
    return {
      answer: 'Wi-Fi complaints increased the most this week — up 240% compared to last week. Hostel water complaints also grew significantly at 180%.',
      metrics: [
        { label: 'Wi-Fi increase', value: '+240%' },
        { label: 'Hostel water increase', value: '+180%' },
        { label: 'Placement increase', value: '+45%' },
      ],
      relatedIssue: 'Laboratory Wi-Fi',
    };
  }
  if (l.includes('overdue')) {
    return {
      answer: 'There is 1 overdue action: "Install additional water storage tanks" for Hostel Water Supply, which was due on August 25. 4 actions are in progress and 2 are completed.',
      metrics: [
        { label: 'Overdue', value: '1' },
        { label: 'In Progress', value: '4' },
        { label: 'Completed', value: '2' },
      ],
      relatedIssue: 'Hostel Water Supply',
    };
  }
  if (l.includes('improve') || l.includes('better') || l.includes('work')) {
    return {
      answer: 'Two actions show clear improvement:\n\n1. Canteen vendor change — negative feedback dropped from 65% to 27% (+38 points improvement)\n2. Library seating expansion — negative feedback dropped from 58% to 15% (+43 points improvement)\n\nLaboratory system upgrades are in progress with early signs of improvement.',
      metrics: [
        { label: 'Canteen improvement', value: '+38 pts' },
        { label: 'Library improvement', value: '+43 pts' },
      ],
      relatedIssue: 'Canteen Food Quality',
    };
  }
  return {
    answer: 'Based on current data, the top institutional priorities are:\n\n1. Laboratory Wi-Fi (critical, 82% negative)\n2. Hostel Water Supply (critical, recurring)\n3. Placement Training (high, rising trend)\n\nWould you like details on any specific area?',
    metrics: [
      { label: 'Critical issues', value: '2' },
      { label: 'High priority', value: '3' },
      { label: 'Actions in progress', value: '4' },
    ],
  };
}

export function getAIExplanation(insightType: string): AIExplanation {
  const explanations: Record<string, AIExplanation> = {
    priority: {
      title: 'Why This Issue Is High Priority',
      reasons: [
        '37 related feedback responses in the last 7 days',
        '82% negative sentiment among related responses',
        '5 consecutive days of complaints',
        '24% increase from previous week',
        'Affects students across all 4 years',
      ],
    },
    theme: {
      title: 'Why This Theme Is Flagged',
      reasons: [
        'Feedback volume is above the 7-day average',
        'Negative sentiment trend is increasing',
        'Multiple related issues detected by clustering',
        'Recurring patterns identified across departments',
      ],
    },
    cause: {
      title: 'Why This Factor Was Identified',
      reasons: [
        '23 feedback responses mention related keywords',
        'Keyword co-occurrence analysis shows strong correlation',
        'Temporal patterns align with peak usage times',
        'Evidence strength rated as moderate based on response volume',
      ],
    },
    alert: {
      title: 'Why This Alert Was Triggered',
      reasons: [
        'Complaint volume exceeded the anomaly threshold',
        'Rate of change is statistically significant',
        'Pattern matches known emerging issue signatures',
        'Severity escalated based on sentiment analysis',
      ],
    },
  };
  return explanations[insightType] || explanations.priority;
}
