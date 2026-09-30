import { apiClient } from './apiClient';
import type {
  Recommendation,
  CreateRecommendationInput,
  ReviewRecommendationInput,
  ConvertRecommendationActionInput
} from '@/types';

export interface RecommendationListResponse {
  recommendations: Recommendation[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

/**
 * Fetch list of recommendations from backend /api/recommendations
 * Enforces role isolation (HOD gets own department; Management gets institution-wide).
 */
export async function fetchRecommendations(filters: {
  department?: string | null;
  status?: string | null;
  priority?: string | null;
  page?: number;
  limit?: number;
} = {}): Promise<RecommendationListResponse> {
  try {
    const params: Record<string, any> = {};
    if (filters.department && filters.department !== 'ALL' && filters.department !== 'all') {
      params.department = filters.department;
    }
    if (filters.status && filters.status !== 'all') {
      params.status = filters.status;
    }
    if (filters.priority && filters.priority !== 'all') {
      params.priority = filters.priority;
    }
    if (filters.page) params.page = filters.page;
    if (filters.limit) params.limit = filters.limit;

    const res = await apiClient.get('/recommendations', { params });
    if (res.success) {
      return {
        recommendations: Array.isArray(res.data) ? res.data : (res.data?.recommendations || []),
        pagination: res.pagination,
      };
    }
    return { recommendations: [] };
  } catch (err) {
    console.error('[recommendationService.fetchRecommendations failed]:', err);
    throw err;
  }
}

/**
 * Fetch a single recommendation by ID along with audit updates and linked issue
 */
export async function fetchRecommendationById(id: number | string): Promise<Recommendation> {
  try {
    const res = await apiClient.get(`/recommendations/${id}`);
    if (res.success && res.data) {
      return res.data;
    }
    throw new Error(res.message || 'Failed to fetch recommendation.');
  } catch (err) {
    console.error(`[recommendationService.fetchRecommendationById failed for ${id}]:`, err);
    throw err;
  }
}

/**
 * Create a new recommendation (HOD only)
 */
export async function createRecommendation(data: CreateRecommendationInput): Promise<Recommendation> {
  try {
    const res = await apiClient.post('/recommendations', data);
    if (res.success && res.data) {
      return res.data;
    }
    throw new Error(res.message || 'Failed to submit recommendation.');
  } catch (err) {
    console.error('[recommendationService.createRecommendation failed]:', err);
    throw err;
  }
}

/**
 * Review a recommendation (Management only: approve, reject, or defer)
 */
export async function reviewRecommendation(
  id: number | string,
  data: ReviewRecommendationInput
): Promise<Recommendation> {
  try {
    const res = await apiClient.put(`/recommendations/${id}/review`, data);
    if (res.success && res.data) {
      return res.data;
    }
    throw new Error(res.message || 'Failed to submit review.');
  } catch (err) {
    console.error(`[recommendationService.reviewRecommendation failed for ${id}]:`, err);
    throw err;
  }
}

/**
 * Convert an approved recommendation to an institutional corrective action (Management only)
 */
export async function convertRecommendationToAction(
  id: number | string,
  data: ConvertRecommendationActionInput
): Promise<any> {
  try {
    const res = await apiClient.post(`/recommendations/${id}/create-action`, data);
    if (res.success && res.data) {
      return res.data;
    }
    throw new Error(res.message || 'Failed to convert recommendation to action.');
  } catch (err) {
    console.error(`[recommendationService.convertRecommendationToAction failed for ${id}]:`, err);
    throw err;
  }
}
