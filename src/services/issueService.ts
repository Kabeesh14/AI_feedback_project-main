import type { Issue, PossibleCause, FeedbackStatus } from '@/types';
import { generateIssues } from './mockData';

type IssueListener = (issues: Issue[]) => void;
const listeners: Set<IssueListener> = new Set();

export function subscribeIssueChange(listener: IssueListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners() {
  listeners.forEach(l => l([...issues]));
}

const issues: Issue[] = generateIssues();

function isAllDept(dept?: string | null): boolean {
  return !dept || dept === 'ALL' || dept === 'all' || dept === 'All Departments';
}

export function getAllIssues(dept?: string | null): Issue[] {
  if (isAllDept(dept)) return [...issues];
  return issues.filter(i => i.department === dept);
}

export function updateIssueStatus(idOrTitle: string, status: FeedbackStatus): void {
  const issue = issues.find(i => i.id === idOrTitle || i.title === idOrTitle);
  if (issue) {
    issue.status = status;
    notifyListeners();
  }
}

export function getIssueById(id: string): Issue | undefined {
  return issues.find(i => i.id === id);
}

export function getIssuesBySeverity(severity: Issue['severity'], dept?: string | null): Issue[] {
  return getAllIssues(dept).filter(i => i.severity === severity);
}

export function getCriticalIssues(dept?: string | null): Issue[] {
  return getAllIssues(dept).filter(i => i.severity === 'critical');
}

export function getHighPriorityIssues(dept?: string | null): Issue[] {
  return getAllIssues(dept).filter(i => i.severity === 'high' || i.severity === 'critical');
}

export function searchIssues(query: string, dept?: string | null): Issue[] {
  const l = query.toLowerCase();
  return getAllIssues(dept).filter(i =>
    i.title.toLowerCase().includes(l) ||
    i.category.toLowerCase().includes(l) ||
    i.keywords.some(k => k.toLowerCase().includes(l))
  );
}

const causeEvidence: Record<string, PossibleCause[]> = {
  'Laboratory Wi-Fi': [
    {
      id: 'cause-wifi-1',
      factor: 'Network Congestion',
      relatedFeedbackCount: 23,
      supportingKeywords: ['slow', 'disconnect', 'peak time', 'multiple users'],
      evidenceExamples: [
        'Internet becomes slow during practical sessions when many students connect.',
        'Multiple systems accessing online resources simultaneously causes slowdown.',
        'Wi-Fi disconnects when the lab is at full capacity.',
      ],
      confidence: 'moderate',
    },
    {
      id: 'cause-wifi-2',
      factor: 'Access Point Coverage',
      relatedFeedbackCount: 15,
      supportingKeywords: ['signal', 'weak', 'corner', 'dead zone'],
      evidenceExamples: [
        'Wi-Fi signal is weak in the corner of the lab.',
        'Some systems cannot connect at all due to poor signal.',
        'Dead zones in the laboratory block.',
      ],
      confidence: 'moderate',
    },
    {
      id: 'cause-wifi-3',
      factor: 'Bandwidth Capacity',
      relatedFeedbackCount: 18,
      supportingKeywords: ['slow', 'limited', 'throttle', 'capacity'],
      evidenceExamples: [
        'Internet speed drops significantly during peak hours.',
        'Bandwidth seems insufficient for the number of users.',
        'Streaming and downloads are extremely slow.',
      ],
      confidence: 'high',
    },
    {
      id: 'cause-wifi-4',
      factor: 'Peak-Time Usage',
      relatedFeedbackCount: 20,
      supportingKeywords: ['peak', 'practical', 'session', 'time'],
      evidenceExamples: [
        'Problems mainly occur during practical session hours.',
        'Issues are worse between 2 PM and 4 PM when all labs are active.',
        'Weekday mornings are fine, afternoons are problematic.',
      ],
      confidence: 'high',
    },
  ],
  'Slow Laboratory Computers': [
    {
      id: 'cause-pc-1',
      factor: 'Outdated Hardware',
      relatedFeedbackCount: 19,
      supportingKeywords: ['outdated', 'old', 'slow', 'hardware'],
      evidenceExamples: [
        'Lab PCs are very old and need replacement.',
        'Systems take several minutes to boot.',
        'Hardware cannot handle modern development tools.',
      ],
      confidence: 'high',
    },
    {
      id: 'cause-pc-2',
      factor: 'Insufficient RAM',
      relatedFeedbackCount: 12,
      supportingKeywords: ['ram', 'memory', 'lag', 'freeze'],
      evidenceExamples: [
        'Systems freeze when running IDEs like IntelliJ.',
        'Not enough memory for running virtual machines.',
        'Applications crash frequently due to low memory.',
      ],
      confidence: 'moderate',
    },
    {
      id: 'cause-pc-3',
      factor: 'High System Utilization',
      relatedFeedbackCount: 14,
      supportingKeywords: ['utilization', 'load', 'shared', 'performance'],
      evidenceExamples: [
        'Shared systems are slow when multiple students use them.',
        'Performance degrades with heavy workloads.',
        'Systems lag during simultaneous compilation tasks.',
      ],
      confidence: 'moderate',
    },
    {
      id: 'cause-pc-4',
      factor: 'Lack of Maintenance',
      relatedFeedbackCount: 10,
      supportingKeywords: ['maintenance', 'dust', 'clean', 'service'],
      evidenceExamples: [
        'Systems have not been serviced in a long time.',
        'Dust buildup affects performance.',
        'No regular maintenance schedule for lab equipment.',
      ],
      confidence: 'low',
    },
  ],
  'Hostel Water Supply': [
    {
      id: 'cause-water-1',
      factor: 'Inadequate Storage Capacity',
      relatedFeedbackCount: 16,
      supportingKeywords: ['storage', 'tank', 'capacity', 'shortage'],
      evidenceExamples: [
        'Water runs out by 8 AM every morning.',
        'Storage tanks are too small for the number of residents.',
        'Water shortage during peak usage hours.',
      ],
      confidence: 'high',
    },
    {
      id: 'cause-water-2',
      factor: 'Pump Timing Issues',
      relatedFeedbackCount: 11,
      supportingKeywords: ['pump', 'timing', 'schedule', 'morning'],
      evidenceExamples: [
        'Water pump does not start early enough in the morning.',
        'Pump timing does not align with student schedules.',
        'Inconsistent pump operation causes shortages.',
      ],
      confidence: 'moderate',
    },
    {
      id: 'cause-water-3',
      factor: 'Pipeline Leaks',
      relatedFeedbackCount: 7,
      supportingKeywords: ['leak', 'pipe', 'pressure', 'waste'],
      evidenceExamples: [
        'Water pressure is low, possibly due to pipeline leaks.',
        'Visible leaks in the hostel plumbing system.',
        'Water wastage reduces available supply.',
      ],
      confidence: 'low',
    },
    {
      id: 'cause-water-4',
      factor: 'Peak Hour Demand',
      relatedFeedbackCount: 13,
      supportingKeywords: ['peak', 'morning', 'demand', 'rush'],
      evidenceExamples: [
        'Everyone needs water at the same time in the morning.',
        'Peak demand exceeds supply capacity.',
        'Morning rush hour creates severe shortages.',
      ],
      confidence: 'moderate',
    },
  ],
};

export function getPossibleCauses(issueTitle: string): PossibleCause[] {
  return causeEvidence[issueTitle] || [
    {
      id: 'cause-default-1',
      factor: 'Insufficient Data',
      relatedFeedbackCount: 0,
      supportingKeywords: [],
      evidenceExamples: ['Not enough feedback data to identify contributing factors.'],
      confidence: 'low',
    },
  ];
}
