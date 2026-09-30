import { apiClient } from './apiClient';

export interface FormQuestion {
  id: number;
  form_id: number;
  question_text: string;
  question_type: 'rating' | 'mcq' | 'yes_no' | 'text';
  options?: string[];
  is_required: boolean;
  sort_order: number;
}

export interface FeedbackForm {
  id: number;
  department_id: number;
  department: string;
  department_name?: string;
  department_code?: string;
  created_by: number;
  creator_name?: string;
  title: string;
  description: string | null;
  target_audience?: 'student' | 'faculty';
  target_academic_year: string | null;
  target_semester: string | null;
  status: 'draft' | 'published' | 'closed';
  created_at: string;
  updated_at?: string;
  closed_at?: string | null;
  question_count?: number;
  submission_count?: number;
  has_submitted?: boolean;
  my_submitted_at?: string | null;
  questions?: FormQuestion[];
  ai_summary?: string | null;
  ai_sentiment_distribution?: any;
  ai_primary_area?: string | null;
  ai_priority?: 'low' | 'medium' | 'high' | 'critical' | null;
  ai_status?: 'pending' | 'processing' | 'completed' | 'failed';
  ai_analyzed_at?: string | null;
  ai_error_message?: string | null;
}

export interface ParticipationStudent {
  studentId: number;
  studentName: string;
  email: string;
  status: 'responded' | 'not_responded';
  submittedAt: string | null;
}

export interface FormParticipationData {
  form: {
    id: number;
    title: string;
    description: string | null;
    status: 'draft' | 'published' | 'closed';
    department: string;
    departmentId: number;
    targetAudience?: 'student' | 'faculty';
    target_audience?: 'student' | 'faculty';
    targetAcademicYear: string | null;
    targetSemester: string | null;
    createdAt: string;
    closedAt: string | null;
  };
  stats: {
    targeted: number;
    responded: number;
    notResponded: number;
    responseRate: number;
    responseRateFormatted: string;
    totalSubmissions: number;
    anonymousHistoricalSubmissions?: number;
  };
  students: ParticipationStudent[];
  respondedList: ParticipationStudent[];
  notRespondedList: ParticipationStudent[];
}

export interface SubmissionAnswerDetail {
  question_id: number;
  rating_value?: number | null;
  selected_option?: string | null;
  text_response?: string | null;
  question_text?: string;
  question_type?: 'rating' | 'mcq' | 'yes_no' | 'text';
  sort_order?: number;
}

export interface SubmissionStatus {
  submitted: boolean;
  hasSubmitted: boolean;
  submittedAt: string | null;
  submissionId: number | null;
  imageUrl?: string | null;
  answers?: SubmissionAnswerDetail[];
}

/**
 * Fetch forms for current authenticated user role
 * Safely handles both { data: [...] } and { data: { forms: [...] } }
 */
export async function fetchForms(params?: { status?: string; department?: string; page?: number; limit?: number }): Promise<FeedbackForm[]> {
  const queryParams: Record<string, string | number> = {};
  if (params?.status) queryParams.status = params.status;
  if (params?.department) queryParams.department = params.department;
  if (params?.page) queryParams.page = params.page;
  if (params?.limit) queryParams.limit = params.limit;

  const res = await apiClient.get<any>('/forms', {
    params: queryParams
  });

  if (Array.isArray(res?.data)) {
    return res.data;
  }
  if (Array.isArray(res?.data?.forms)) {
    return res.data.forms;
  }
  if (Array.isArray(res?.forms)) {
    return res.forms;
  }
  if (Array.isArray(res)) {
    return res;
  }
  return [];
}

/**
 * Fetch forms targeted to student's department
 */
export async function fetchStudentForms(): Promise<FeedbackForm[]> {
  const res = await apiClient.get<any>('/forms/student');

  if (Array.isArray(res?.data)) {
    return res.data;
  }
  if (Array.isArray(res)) {
    return res;
  }
  return [];
}

/**
 * Fetch forms targeted to faculty's department
 */
export async function fetchFacultyForms(params?: { submittedOnly?: boolean; page?: number; limit?: number }): Promise<FeedbackForm[]> {
  const queryParams: Record<string, string | number | boolean> = {};
  if (params?.submittedOnly !== undefined) queryParams.submittedOnly = params.submittedOnly;
  if (params?.page) queryParams.page = params.page;
  if (params?.limit) queryParams.limit = params.limit;

  const res = await apiClient.get<any>('/forms/faculty', {
    params: Object.keys(queryParams).length > 0 ? queryParams : undefined
  });

  if (Array.isArray(res?.data)) {
    return res.data;
  }
  if (Array.isArray(res?.data?.forms)) {
    return res.data.forms;
  }
  if (Array.isArray(res?.forms)) {
    return res.forms;
  }
  if (Array.isArray(res)) {
    return res;
  }
  return [];
}

/**
 * Fetch a single form by ID
 */
export async function fetchFormById(formId: number): Promise<FeedbackForm | null> {
  const res = await apiClient.get<any>(`/forms/${formId}`);
  return res?.data || res || null;
}

/**
 * Fetch participation metrics and respondent status for a form
 * (Privacy-preserving: contains zero question or answer content)
 * Safely handles both direct root response and { data: ... }
 */
export async function fetchFormParticipation(formId: number): Promise<FormParticipationData | null> {
  const res = await apiClient.get<any>(`/forms/${formId}/participation`);

  if (!res) return null;
  if (res.data && res.data.form && res.data.stats) {
    return res.data as FormParticipationData;
  }
  if (res.form && res.stats) {
    return res as FormParticipationData;
  }
  return (res.data || res || null) as FormParticipationData | null;
}

/**
 * Fetch student's own submission status for a form
 */
export async function fetchSubmissionStatus(formId: number): Promise<SubmissionStatus | null> {
  const res = await apiClient.get<any>(`/forms/${formId}/submission-status`);
  return res?.data || res || null;
}

export interface AnalysisTheme {
  title: string;
  description: string;
  responseCount: number;
  rootCauses: string[];
  evidence: string[];
}

export interface QuestionStatItem {
  questionId: number;
  questionText: string;
  questionType: 'rating' | 'mcq' | 'yes_no' | 'text';
  totalResponses: number;
  stats?: {
    averageRating?: number;
    distribution?: Record<string, number>;
    optionCounts?: Record<string, number>;
    optionPercentages?: Record<string, string>;
    yesCount?: number;
    noCount?: number;
    yesPercentage?: string;
    noPercentage?: string;
  };
}

export interface FormAnalysisData {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  formId: number;
  formTitle: string;
  department: string;
  analyzedAt: string | null;
  errorMessage?: string | null;
  summary: string | null;
  primaryArea: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null;
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
  } | null;
  themes: AnalysisTheme[];
  questionStats: QuestionStatItem[];
  totalAnalyzed: number;
  provider: string | null;
  message?: string;
}

/**
 * Trigger Collective AI Analysis for a form (HOD only)
 */
export async function triggerFormAnalysis(formId: number) {
  const res = await apiClient.post<{
    success: boolean;
    data: FormAnalysisData;
  }>(`/forms/${formId}/analyze`);

  return res.data;
}

/**
 * Retrieve Collective AI Analysis for a form (HOD/Faculty in dept, Management institution-wide)
 */
export async function fetchFormAnalysis(formId: number): Promise<FormAnalysisData | null> {
  const res = await apiClient.get<any>(`/forms/${formId}/analysis`);
  if (!res) return null;
  if (res.data && (res.data.status !== undefined || res.data.formId !== undefined)) {
    return res.data as FormAnalysisData;
  }
  return (res.data || res || null) as FormAnalysisData | null;
}

/**
 * Payload for creating a question
 */
export interface CreateQuestionPayload {
  question_text: string;
  question_type: 'rating' | 'mcq' | 'yes_no' | 'text';
  options?: string[];
  is_required?: boolean;
  sort_order?: number;
}

/**
 * Payload for creating a new feedback form
 */
export interface CreateFormPayload {
  title: string;
  description?: string | null;
  targetAudience?: 'student' | 'faculty';
  target_audience?: 'student' | 'faculty';
  target_academic_year?: string | null;
  targetAcademicYear?: string | null;
  target_semester?: string | null;
  targetSemester?: string | null;
  questions?: CreateQuestionPayload[];
}

/**
 * Create a new draft feedback form (HOD only)
 */
export async function createForm(payload: CreateFormPayload): Promise<FeedbackForm> {
  const res = await apiClient.post<any>('/forms', payload);
  if (res?.data) return res.data;
  if (res?.form) return res.form;
  return res as FeedbackForm;
}

/**
 * Add a question to an existing draft form (HOD only)
 */
export async function addQuestion(formId: number, question: CreateQuestionPayload): Promise<FormQuestion> {
  const res = await apiClient.post<any>(`/forms/${formId}/questions`, question);
  if (res?.data) return res.data;
  return res as FormQuestion;
}

/**
 * Publish a draft form (HOD only)
 */
export async function publishForm(formId: number): Promise<FeedbackForm> {
  const res = await apiClient.post<any>(`/forms/${formId}/publish`);
  if (res?.data) return res.data;
  return res as FeedbackForm;
}

/**
 * Close a published form (HOD only)
 */
export async function closeForm(formId: number): Promise<FeedbackForm> {
  const res = await apiClient.post<any>(`/forms/${formId}/close`);
  if (res?.data) return res.data;
  return res as FeedbackForm;
}

/**
 * Payload for a student's answer to a single question
 */
export interface FormAnswerSubmission {
  question_id: number;
  rating_value?: number;
  selected_option?: string;
  text_response?: string;
}

/**
 * Submit student answers for a published feedback form
 */
export async function submitFormResponse(
  formId: number,
  answers: FormAnswerSubmission[],
  imageUrl?: string | null
): Promise<any> {
  const res = await apiClient.post<any>(`/forms/${formId}/submit`, {
    answers,
    imageUrl: imageUrl || null
  });
  if (res?.data) return res.data;
  return res;
}


