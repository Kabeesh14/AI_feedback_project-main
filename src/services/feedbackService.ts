import type { Feedback, FeedbackStatus, Category, Department, Sentiment, Severity } from '@/types';
import { generateFeedback } from './mockData';

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

let feedbackStore: Feedback[] = generateFeedback(900);

function isAllDept(dept?: string | null): boolean {
  return !dept || dept === 'ALL' || dept === 'all' || dept === 'All Departments';
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

export function addFeedback(feedback: Omit<Feedback, 'id'>): Feedback {
  const newFeedback: Feedback = {
    ...feedback,
    id: `fb-${feedbackStore.length + 1}-${Date.now()}`,
  };
  feedbackStore = [newFeedback, ...feedbackStore];
  notifyListeners();
  return newFeedback;
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
      row[cat] = Math.floor(Math.random() * 20) + 1;
    });
    return row;
  });
}

