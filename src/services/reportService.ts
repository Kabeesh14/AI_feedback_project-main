import { apiClient } from './apiClient';

export interface ReportConfig {
  id: string;
  name: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'critical' | 'effectiveness' | 'student' | 'faculty';
}

export interface ReportPreviewData {
  headers: string[];
  rows: string[][];
  calculationMethod?: string;
  dailyReports?: Array<{
    dayIndex: number;
    dayLabel: string;
    shortLabel: string;
    dateStr: string;
    headers: string[];
    rows: string[][];
  }>;
}

export function getAvailableReports(role?: string): ReportConfig[] {
  if (role === 'hod') {
    return [
      {
        id: 'daily-student',
        name: 'Daily Student Survey Summary',
        description: 'Daily summary of student survey form submissions including name, email, register number, and submission time.',
        type: 'daily'
      },
      {
        id: 'daily-faculty',
        name: 'Daily Faculty Survey Summary',
        description: 'Daily summary of faculty survey form submissions including name, email, and submission time.',
        type: 'daily'
      },
      {
        id: 'weekly-student',
        name: 'Weekly Student Survey Summary',
        description: 'Weekly aggregate of student survey form submissions including name, email, register number, and submission time.',
        type: 'weekly'
      },
      {
        id: 'weekly-faculty',
        name: 'Weekly Faculty Survey Summary',
        description: 'Weekly aggregate of faculty survey form submissions including name, email, and submission time.',
        type: 'weekly'
      }
    ];
  }

  if (role === 'management') {
    return [
      {
        id: 'dept-survey-daily',
        name: 'Daily Department Survey Report',
        description: 'Department-wise daily survey summary with student counts, forms created, and student/faculty response percentages.',
        type: 'daily'
      },
      {
        id: 'dept-survey-weekly',
        name: 'Weekly Department Survey Report',
        description: 'Department-wise weekly survey report calculated and summarized from 6 daily department survey reports with student counts, forms created, and response percentages.',
        type: 'weekly'
      },
      {
        id: 'dept-student-survey',
        name: 'Department Student Survey Report',
        description: 'Comprehensive student survey overview across departments with total students, forms created, and response rates.',
        type: 'student'
      },
      {
        id: 'dept-faculty-survey',
        name: 'Department Faculty Survey Report',
        description: 'Comprehensive faculty survey overview across departments with student counts, forms created, and faculty response rates.',
        type: 'faculty'
      }
    ];
  }

  return [
    { id: 'r1', name: 'Daily Feedback Summary', description: 'Comprehensive summary of all feedback received today with sentiment breakdown and emerging issues.', type: 'daily' },
    { id: 'r2', name: 'Weekly Department Report', description: 'Department-wise weekly performance with trend analysis and comparison metrics.', type: 'weekly' },
    { id: 'r3', name: 'Monthly Institutional Report', description: 'Institution-wide monthly report covering all departments, themes, and action effectiveness.', type: 'monthly' },
    { id: 'r4', name: 'Critical Issues Report', description: 'Detailed analysis of all critical and high-priority issues with root-cause hypotheses.', type: 'critical' },
    { id: 'r5', name: 'Action Effectiveness Report', description: 'Impact measurement of completed corrective actions with before/after comparisons.', type: 'effectiveness' },
  ];
}

/**
 * Fetch live report table from backend API
 */
export async function fetchReportPreview(
  reportId: string,
  department?: string | null
): Promise<ReportPreviewData> {
  const isAll = !department || department === 'ALL' || department === 'all' || department === 'All Departments';
  const params: Record<string, any> = {};
  if (!isAll && department) {
    params.department = department;
  }

  // Handle Management Department Survey Reports
  if (['dept-survey-daily', 'dept-survey-weekly', 'dept-student-survey', 'dept-faculty-survey'].includes(reportId)) {
    params.type = reportId;
    try {
      const res = await apiClient.get('/reports/department-survey', { params });
      if (res.success && res.data?.headers && Array.isArray(res.data?.rows)) {
        return {
          headers: res.data.headers,
          rows: res.data.rows,
          calculationMethod: res.data.calculationMethod,
          dailyReports: res.data.dailyReports
        };
      }
      return { headers: [], rows: [] };
    } catch (err) {
      console.warn(`[reportService.fetchReportPreview management survey ${reportId} failed]:`, err);
      throw err;
    }
  }

  // Handle HOD survey reports
  if (['daily-student', 'daily-faculty', 'weekly-student', 'weekly-faculty'].includes(reportId)) {
    params.type = reportId;
    try {
      const res = await apiClient.get('/reports/survey-report', { params });
      if (res.success && res.data?.headers && Array.isArray(res.data?.rows)) {
        return {
          headers: res.data.headers,
          rows: res.data.rows,
        };
      }
      return { headers: [], rows: [] };
    } catch (err) {
      console.warn(`[reportService.fetchReportPreview survey ${reportId} failed]:`, err);
      throw err;
    }
  }

  const endpointMap: Record<string, string> = {
    r1: '/reports/summary',
    r2: '/reports/department',
    r3: '/reports/summary',
    r4: '/reports/issues',
    r5: '/reports/actions',
  };

  const endpoint = endpointMap[reportId] || '/reports/summary';

  try {
    const res = await apiClient.get(endpoint, { params });
    if (res.success && res.data?.headers && Array.isArray(res.data?.rows)) {
      return {
        headers: res.data.headers,
        rows: res.data.rows,
      };
    }
    return { headers: [], rows: [] };
  } catch (err) {
    console.warn(`[reportService.fetchReportPreview ${reportId} failed]:`, err);
    throw err;
  }
}

export function generateReportPreview(reportId?: string, department?: string | null): { headers: string[]; rows: string[][] } {
  return { headers: [], rows: [] };
}
