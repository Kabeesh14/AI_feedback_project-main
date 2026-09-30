import type { Feedback, FeedbackStatus, Category, Sentiment } from '@/types';
import { apiClient } from './apiClient';

type FeedbackListener = (feedback: Feedback[]) => void;
const listeners: Set<FeedbackListener> = new Set();

export function subscribeFeedbackChange(listener: FeedbackListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners() {
  listeners.forEach(l => l([...feedbackStore]));
}

// In-memory cache populated from real backend API fetch
let feedbackStore: Feedback[] = [];

function isAllDept(dept?: string | null): boolean {
  return !dept || dept === 'ALL' || dept === 'all' || dept === 'All Departments';
}

function mapApiRecordToFeedback(item: any): Feedback {
  return {
    id: String(item.id),
    date: item.date || item.createdAt || new Date().toISOString(),
    department: item.department,
    portal: item.portal || 'education',
    bus_number: item.bus_number || item.busNumber || undefined,
    floor: item.floor || undefined,
    year: item.year || item.academicYear || undefined,
    category: item.category as Category,
    comment: item.comment || item.feedbackText || '',
    sentiment: (item.sentiment?.toLowerCase() || 'neutral') as Sentiment,
    theme: item.theme || 'General Feedback',
    issue: item.issue || item.theme || 'General Feedback',
    severity: (item.severity || item.priority || 'medium').toLowerCase(),
    status: (item.status?.toLowerCase() || 'received') as FeedbackStatus,
    anonymous: Boolean(item.anonymous || item.isAnonymous),
    studentId: item.studentId || (item.userId ? `STU-${item.userId}` : 'ANONYMOUS'),
    submitterRole: item.submitterRole || item.submitter_role || (item.userRole?.toLowerCase()) || (item.role?.toLowerCase()) || 'student',
    imageUrl: item.imageUrl || item.image_url || undefined,
    image_url: item.imageUrl || item.image_url || undefined,
  };
}

/**
 * Fetch feedback list from real backend API with role and department isolation
 */
export async function fetchFeedback(filters: {
  department?: string | null;
  portal?: string | null;
  bus_number?: string | null;
  floor?: string | null;
  category?: string | null;
  sentiment?: string | null;
  status?: string | null;
  search?: string | null;
  source?: 'student' | 'faculty' | 'all' | string | null;
  page?: number;
  limit?: number;
} = {}): Promise<Feedback[]> {
  try {
    const params: Record<string, any> = {};
    if (filters.department && !isAllDept(filters.department)) {
      params.department = filters.department;
    }
    if (filters.portal) params.portal = filters.portal;
    if (filters.bus_number) params.bus_number = filters.bus_number;
    if (filters.floor) params.floor = filters.floor;
    if (filters.category) params.category = filters.category;
    if (filters.sentiment) params.sentiment = filters.sentiment;
    if (filters.status) params.status = filters.status;
    if (filters.search) params.search = filters.search;
    if (filters.source && filters.source !== 'all') params.source = filters.source;
    if (filters.page) params.page = filters.page;
    if (filters.limit) params.limit = filters.limit;

    const res = await apiClient.get('/feedback', { params });
    if (res.success && Array.isArray(res.data)) {
      const mapped = res.data.map(mapApiRecordToFeedback);
      // Merge with or replace store
      feedbackStore = mapped;
      notifyListeners();
      return mapped;
    }
    return [];
  } catch (err) {
    console.error('[feedbackService.fetchFeedback failed]:', err);
    throw err;
  }
}

/**
 * Fetch student's own feedback history from real backend API
 */
export async function fetchMyFeedback(): Promise<Feedback[]> {
  try {
    const res = await apiClient.get('/feedback/my', { params: { limit: 100 } });
    if (res.success && Array.isArray(res.data)) {
      const mapped = res.data.map(mapApiRecordToFeedback);
      return mapped;
    }
    return [];
  } catch (err) {
    console.error('[feedbackService.fetchMyFeedback failed]:', err);
    throw err;
  }
}

/**
 * Fetch single feedback by ID from real backend API
 */
export async function fetchFeedbackById(id: string): Promise<Feedback | null> {
  try {
    const res = await apiClient.get(`/feedback/${id}`);
    if (res.success && res.data) {
      return mapApiRecordToFeedback(res.data);
    }
    return null;
  } catch (err) {
    console.error(`[feedbackService.fetchFeedbackById ${id} failed]:`, err);
    throw err;
  }
}

/**
 * Create feedback in real backend MySQL database
 */
export async function addFeedback(feedback: Omit<Feedback, 'id'> & { rating?: number }): Promise<Feedback> {
  // Determine rating if not explicitly supplied
  let rating = feedback.rating;
  if (!rating) {
    if (feedback.sentiment === 'positive') rating = 5;
    else if (feedback.sentiment === 'negative') rating = 1;
    else rating = 3;
  }

  const payload: Record<string, any> = {
    feedbackText: feedback.comment,
    comment: feedback.comment,
    rating,
    category: feedback.category,
    anonymous: Boolean(feedback.anonymous),
    department: feedback.department,
    academicYear: feedback.year || null,
  };
  if (feedback.portal) payload.portal = feedback.portal;
  if (feedback.bus_number) payload.bus_number = feedback.bus_number;
  if (feedback.floor) payload.floor = feedback.floor;
  if (feedback.imageUrl || (feedback as any).image_url) {
    payload.imageUrl = feedback.imageUrl || (feedback as any).image_url;
  }

  try {
    const res = await apiClient.post('/feedback', payload);
    if (res.success && res.data) {
      const created = mapApiRecordToFeedback(res.data);
      feedbackStore = [created, ...feedbackStore];
      notifyListeners();
      return created;
    }
  } catch (err) {
    console.error('[feedbackService.addFeedback API failed]:', err);
    throw err;
  }

  // Fallback local creation if API response structure was unexpected
  const localFallback: Feedback = {
    ...feedback,
    id: `fb-${feedbackStore.length + 1}-${Date.now()}`,
  };
  feedbackStore = [localFallback, ...feedbackStore];
  notifyListeners();
  return localFallback;
}

export function getAllFeedback(dept?: string | null): Feedback[] {
  if (isAllDept(dept)) return [...feedbackStore];
  return feedbackStore.filter(f => f.department === dept);
}

export function getFeedbackById(id: string): Feedback | undefined {
  return feedbackStore.find(f => f.id === id);
}

export function getFeedbackByDepartment(dept: string): Feedback[] {
  if (isAllDept(dept)) return [...feedbackStore];
  return feedbackStore.filter(f => f.department === dept);
}

export function getFeedbackByCategory(cat: Category, dept?: string | null): Feedback[] {
  return feedbackStore.filter(f => f.category === cat && (isAllDept(dept) || f.department === dept));
}

export function getFeedbackByIssue(issue: string, dept?: string | null): Feedback[] {
  return feedbackStore.filter(f => f.issue === issue && (isAllDept(dept) || f.department === dept));
}

export function getFeedbackBySentiment(sentiment: Sentiment, dept?: string | null): Feedback[] {
  return feedbackStore.filter(f => f.sentiment === sentiment && (isAllDept(dept) || f.department === dept));
}

export function getFeedbackByStatus(status: FeedbackStatus, dept?: string | null): Feedback[] {
  return feedbackStore.filter(f => f.status === status && (isAllDept(dept) || f.department === dept));
}

export function getTodaysFeedback(department?: string | null): Feedback[] {
  const todayStr = new Date().toDateString();
  return feedbackStore.filter(f => {
    if (!isAllDept(department) && f.department !== department) return false;
    const d = new Date(f.date);
    return d.toDateString() === todayStr || (Date.now() - d.getTime()) < 24 * 60 * 60 * 1000;
  });
}

export function getRecentFeedback(days: number = 7): Feedback[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return feedbackStore.filter(f => new Date(f.date) >= cutoff);
}

export function searchFeedback(query: string): Feedback[] {
  const l = query.toLowerCase();
  return feedbackStore.filter(f =>
    f.comment.toLowerCase().includes(l) ||
    f.category.toLowerCase().includes(l) ||
    f.issue.toLowerCase().includes(l) ||
    f.theme.toLowerCase().includes(l) ||
    f.department.toLowerCase().includes(l)
  );
}

export function updateFeedbackStatus(id: string, status: FeedbackStatus): void {
  const fb = feedbackStore.find(f => f.id === id);
  if (fb) {
    fb.status = status;
    notifyListeners();
  }
}

export function updateFeedbackStatusByIssue(issueTitle: string, status: FeedbackStatus): void {
  feedbackStore.forEach(f => {
    if (f.issue === issueTitle) {
      f.status = status;
    }
  });
  notifyListeners();
}

export function getFeedbackStats(department?: string | null) {
  const data = !isAllDept(department) ? getFeedbackByDepartment(department!) : feedbackStore;
  const total = data.length;
  const positive = data.filter(f => f.sentiment === 'positive').length;
  const negative = data.filter(f => f.sentiment === 'negative').length;
  const neutral = data.filter(f => f.sentiment === 'neutral').length;
  const resolved = data.filter(f => f.status === 'resolved').length;
  const inProgress = data.filter(f => f.status === 'in_progress' || f.status === 'action_planned').length;
  const underReview = data.filter(f => f.status === 'under_review').length;

  return {
    total,
    positive,
    negative,
    neutral,
    positivePercent: total ? Math.round((positive / total) * 100) : 0,
    negativePercent: total ? Math.round((negative / total) * 100) : 0,
    neutralPercent: total ? Math.round((neutral / total) * 100) : 0,
    resolved,
    inProgress,
    underReview,
    resolutionRate: total ? Math.round((resolved / total) * 100) : 0,
  };
}

export function getSentimentTrend(days: number = 7, department?: string | null) {
  const trend: { date: string; positive: number; negative: number; neutral: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toDateString();
    const dayData = feedbackStore.filter(
      f => new Date(f.date).toDateString() === dateStr && (isAllDept(department) || f.department === department)
    );
    trend.push({
      date: date.toLocaleDateString('en-US', { weekday: 'short' }),
      positive: dayData.filter(f => f.sentiment === 'positive').length,
      negative: dayData.filter(f => f.sentiment === 'negative').length,
      neutral: dayData.filter(f => f.sentiment === 'neutral').length,
    });
  }
  return trend;
}

export function getCategoryBreakdown(department?: string | null) {
  const data = !isAllDept(department) ? getFeedbackByDepartment(department!) : feedbackStore;
  const categories: Category[] = ['Teaching', 'Laboratory', 'Internet', 'Infrastructure', 'Hostel', 'Canteen', 'Transport', 'Placement', 'Library', 'Examination'];
  return categories.map(cat => {
    const catData = data.filter(f => f.category === cat);
    return {
      category: cat,
      count: catData.length,
      positive: catData.filter(f => f.sentiment === 'positive').length,
      negative: catData.filter(f => f.sentiment === 'negative').length,
      neutral: catData.filter(f => f.sentiment === 'neutral').length,
    };
  });
}

export function getHeatmapData() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const categories: Category[] = ['Teaching', 'Laboratory', 'Internet', 'Infrastructure', 'Hostel', 'Canteen', 'Transport', 'Placement', 'Library', 'Examination'];
  return days.map(day => {
    const row: Record<string, string | number> = { day };
    categories.forEach(cat => {
      row[cat] = 0;
    });
    return row;
  });
}
