import { apiClient } from './apiClient';

export interface ImpactKPIs {
  totalCompletedActions: number;
  measurableImpactActions: number;
  insufficientDataActions: number;
  effectiveActions: number;
  partiallyEffectiveActions: number;
  notEffectiveActions: number;
}

export interface DepartmentImpactSummary {
  department: string;
  completedActions: number;
  measurableImpactActions: number;
  insufficientDataActions: number;
  effectiveActions: number;
  partiallyEffectiveActions: number;
  notEffectiveActions: number;
}

export interface ActionImpactItem {
  id: string;
  title: string;
  department: string;
  priority: string;
  completedAt: string | null;
  dataSufficient: boolean;
  beforeRating: number;
  afterRating: number;
  beforeNegativePct: number;
  afterNegativePct: number;
  beforePositivePct: number;
  afterPositivePct: number;
  complaintReduction: number;
  effectivenessScore: number;
  effectiveness: 'effective' | 'partially_effective' | 'not_effective' | 'insufficient_data';
  evaluation: 'effective' | 'partially_effective' | 'not_effective' | 'insufficient_data';
  explanation?: string;
}

export interface InstitutionImpactOverviewData {
  kpis: ImpactKPIs;
  departments: DepartmentImpactSummary[];
  actions: ActionImpactItem[];
  filterDepartment: string | null;
}

/**
 * Fetch institution-wide impact overview (Management only)
 */
export async function getOverview(department?: string): Promise<InstitutionImpactOverviewData> {
  const isAll = !department || department === 'ALL' || department === 'all' || department === 'All Departments';
  const params: Record<string, string> = {};
  if (!isAll && department) {
    params.department = department;
  }

  const res = await apiClient.get('/impact/overview', { params });
  if (res.success && res.data) {
    return res.data;
  }
  throw new Error(res.message || 'Failed to fetch impact overview.');
}

export const impactService = {
  getOverview
};

export default impactService;
