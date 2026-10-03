export type PortalType = 'education' | 'bus' | 'hostel';

export type Role =
  | 'student'
  | 'faculty'
  | 'hod'
  | 'management'
  | 'bus_incharge'
  | 'transport_incharge'
  | 'hostel_warden';

export type HostelFloor = 'Ground Floor' | '1st Floor' | '2nd Floor' | '3rd Floor' | '4th Floor';
export const OFFICIAL_HOSTEL_FLOORS: HostelFloor[] = ['Ground Floor', '1st Floor', '2nd Floor', '3rd Floor', '4th Floor'];

export type Sentiment = 'positive' | 'negative' | 'neutral';

export type Severity = 'critical' | 'high' | 'medium' | 'low';

export type FeedbackStatus =
  | 'submitted'
  | 'new'
  | 'received'
  | 'under_review'
  | 'action_planned'
  | 'in_progress'
  | 'action_taken'
  | 'resolved'
  | 'closed'
  | 'escalated';

export type Department =
  | 'Information Technology'
  | 'Computer Science and Business System'
  | 'Biotechnology Engineering'
  | 'Biomedical Engineering'
  | 'Artificial Intelligence & Data Science'
  | 'Computer Science & Engineering'
  | 'Electronics & Communication Engineering'
  | 'Mechanical Engineering'
  | 'Civil Engineering'
  | 'Computer Communication Engineering'
  | 'Chemical Engineering'
  | 'Electrical and Electronics Engineering'
  | 'Artificial Intelligence and Machine Learning';

export const OFFICIAL_DEPARTMENTS: Department[] = [
  'Information Technology',
  'Computer Science and Business System',
  'Biotechnology Engineering',
  'Biomedical Engineering',
  'Artificial Intelligence & Data Science',
  'Computer Science & Engineering',
  'Electronics & Communication Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Computer Communication Engineering',
  'Chemical Engineering',
  'Electrical and Electronics Engineering',
  'Artificial Intelligence and Machine Learning',
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
  | 'Other'
  | 'Classroom'
  | 'Food / Canteen'
  | 'Restroom'
  | 'Furniture / Infrastructure'
  | 'Computer / IT'
  | 'Electricity'
  | 'Other campus facilities';

export type Year = '1st Year' | '2nd Year' | '3rd Year' | '4th Year';
export const OFFICIAL_YEARS: Year[] = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

export type StudentSection = 'A' | 'B' | 'C' | 'D';
export const OFFICIAL_SECTIONS: StudentSection[] = ['A', 'B', 'C', 'D'];

export interface Feedback {
  id: string;
  date: string; // ISO date
  portal?: PortalType;
  department?: Department | string | null;
  bus_number?: string | null;
  floor?: HostelFloor | string | null;
  year?: Year | string | null;
  category: Category | string;
  comment: string;
  sentiment: Sentiment;
  theme?: string;
  issue?: string;
  severity: Severity;
  status: FeedbackStatus;
  anonymous: boolean;
  studentId: string;
  submitterRole?: 'student' | 'faculty';
  imageUrl?: string | null;
  image_url?: string | null;
}

export interface Issue {
  id: string;
  title: string;
  portal?: PortalType;
  category: Category | string;
  severity: Severity;
  complaintCount: number;
  negativePercent: number;
  trend: number[]; // last 7 days counts
  affectedYears: Year[];
  affectedLocations: string[];
  department?: Department | 'ALL' | string | null;
  bus_number?: string | null;
  floor?: HostelFloor | string | null;
  keywords: string[];
  cluster: string[];
  status: FeedbackStatus;
  priorityScore?: number | null;
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

export interface ActionUpdate {
  id: string;
  actionId: string;
  updateText: string;
  previousStatus?: string | null;
  newStatus?: string;
  createdBy?: string;
  userId?: number | null;
  createdAt: string;
}

export interface Action {
  id: string;
  portal?: PortalType;
  issueId?: string;
  issueTitle?: string;
  possibleCause?: string;
  action: string;
  title?: string;
  assignedTo: string;
  deadline: string;
  status: 'planned' | 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
  priority?: 'critical' | 'high' | 'medium' | 'low';
  description?: string;
  notes?: string;
  createdAt: string;
  completedAt?: string;
  department?: Department | 'ALL' | string | null;
  bus_number?: string | null;
  floor?: HostelFloor | string | null;
  updates?: ActionUpdate[];
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

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  portal: PortalType;
  department?: Department | null;
  departmentId?: number | null;
  year?: Year | null;
  section?: string | null;
  bus_number?: string | null;
  boarding_point?: string | null;
  room_number?: string | null;
  floor?: HostelFloor | null;
  assigned_floor?: HostelFloor | null;
  createdAt?: string;
}

export * from './recommendation';
