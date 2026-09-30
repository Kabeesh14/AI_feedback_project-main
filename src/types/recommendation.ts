export type RecommendationStatus = 'pending' | 'approved' | 'rejected' | 'deferred';

export type RecommendationPriority = 'critical' | 'high' | 'medium' | 'low';

export interface RecommendationUpdate {
  id: number;
  recommendation_id: number;
  previous_status: string | null;
  new_status: string;
  update_text: string | null;
  actor_id: number | null;
  actor_name: string;
  created_at: string;
}

export interface Recommendation {
  id: number;
  recommendation_code: string;
  issue_id: number;
  issue_title?: string;
  department: string;
  title: string;
  justification: string;
  category: string;
  priority: RecommendationPriority;
  estimated_cost: number;
  created_by: number;
  created_by_name: string;
  status: RecommendationStatus;
  reviewed_by: number | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  action_id: number | null;
  created_at: string;
  updated_at: string;
  updates?: RecommendationUpdate[];
  issue?: {
    id: number;
    issue_code?: string;
    title: string;
    department: string;
    category: string;
    priority?: string;
    severity?: string;
    status?: string;
    complaint_count?: number;
  };
}

export interface CreateRecommendationInput {
  issueId: number | string;
  title: string;
  justification: string;
  category: string;
  priority: RecommendationPriority;
  estimatedCost?: number;
}

export interface ReviewRecommendationInput {
  decision: 'approved' | 'rejected' | 'deferred';
  reviewNotes?: string;
  assignedTo?: string;
  targetCompletionDate?: string;
  createAction?: boolean;
}

export interface ConvertRecommendationActionInput {
  assignedTo: string;
  priority?: RecommendationPriority;
  targetCompletionDate: string;
  estimatedCost?: number;
}
