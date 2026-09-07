export type Role = 'student' | 'hod' | 'management';

export type Sentiment = 'positive' | 'negative' | 'neutral';

export type Severity = 'critical' | 'high' | 'medium' | 'low';

export type FeedbackStatus =
  | 'received'
  | 'under_review'
  | 'action_planned'
  | 'in_progress'
  | 'resolved';

export type Department =
  | 'Information Technology'
  | 'Cyber Security'
  | 'Computer Science and Business Engineering'
  | 'Biotechnology and Biomedical Engineering'
  | 'Artificial Intelligence & Data Science'
  | 'Computer Science & Engineering'
  | 'Electronics & Communication Engineering'
  | 'Mechanical Engineering'
  | 'Civil Engineering';

export const OFFICIAL_DEPARTMENTS: Department[] = [
  'Information Technology',
  'Cyber Security',
  'Computer Science and Business Engineering',
  'Biotechnology and Biomedical Engineering',
  'Artificial Intelligence & Data Science',
  'Computer Science & Engineering',
  'Electronics & Communication Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
];

export type Category =
  | 'Teaching'
  | 'Laboratory'
  | 'Internet'
  | 'Infrastructure'
  | 'Hostel'
  | 'Canteen'
  | 'Transport'
  | 'Placement'
  | 'Library'
  | 'Examination'
  | 'Other';

export type Year = '1st Year' | '2nd Year' | '3rd Year' | '4th Year';

export interface Feedback {
  id: string;
  date: string; // ISO date
  department: Department;
  year: Year;
  category: Category;
  comment: string;
  sentiment: Sentiment;
  theme: string;
  issue: string;
  severity: Severity;
  status: FeedbackStatus;
  anonymous: boolean;
  studentId: string;
}

export interface Issue {
  id: string;
  title: string;
  category: Category;
  severity: Severity;
  complaintCount: number;
  negativePercent: number;
  trend: number[]; // last 7 days counts
  affectedYears: Year[];
  affectedLocations: string[];
  department: Department | 'ALL';
  keywords: string[];
  cluster: string[];
  status: FeedbackStatus;
  priorityScore: number;
}

export interface PossibleCause {
  id: string;
  factor: string;
  relatedFeedbackCount: number;
  supportingKeywords: string[];
  evidenceExamples: string[];
  confidence: 'low' | 'moderate' | 'high';
}

export interface Alert {
  id: string;
  timestamp: string;
  severity: 'critical' | 'warning' | 'success' | 'info';
  issue: string;
  reason: string;
  department: Department | 'ALL';
  read: boolean;
  issueId?: string;
}

export interface Action {
  id: string;
  issueId: string;
  issueTitle: string;
  possibleCause: string;
  action: string;
  assignedTo: string;
  deadline: string;
  status: 'planned' | 'in_progress' | 'completed' | 'overdue';
  createdAt: string;
  department: Department | 'ALL';
  impact?: {
    beforeNegative: number;
    afterNegative: number;
    improvement: number;
  };
}

export interface Theme {
  name: string;
  category: Category;
  responses: number;
  positivePercent: number;
  negativePercent: number;
  trend: number[];
  priority: Severity;
}

export interface Notification {
  id: string;
  type: 'critical_issue' | 'recurring_issue' | 'action_created' | 'improvement' | 'deadline' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface DepartmentMetric {
  department: Department;
  satisfaction: number;
  negativePercent: number;
  issueCount: number;
  resolutionRate: number;
  improvementRate: number;
  totalFeedback: number;
}

export interface CampusArea {
  id: string;
  name: string;
  issueCount: number;
  severity: Severity;
  feedbackCount: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  quickReplies?: string[];
}

export interface AIAnalysis {
  sentiment: Sentiment;
  theme: string;
  issue: string;
  severity: Severity;
  possibleCauses: string[];
  evidenceCount: number;
}

export interface AIExplanation {
  title: string;
  reasons: string[];
}
