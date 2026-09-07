export interface ReportConfig {
  id: string;
  name: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'critical' | 'effectiveness';
}

export function getAvailableReports(): ReportConfig[] {
  return [
    { id: 'r1', name: 'Daily Feedback Summary', description: 'Comprehensive summary of all feedback received today with sentiment breakdown and emerging issues.', type: 'daily' },
    { id: 'r2', name: 'Weekly Department Report', description: 'Department-wise weekly performance with trend analysis and comparison metrics.', type: 'weekly' },
    { id: 'r3', name: 'Monthly Institutional Report', description: 'Institution-wide monthly report covering all departments, themes, and action effectiveness.', type: 'monthly' },
    { id: 'r4', name: 'Critical Issues Report', description: 'Detailed analysis of all critical and high-priority issues with root-cause hypotheses.', type: 'critical' },
    { id: 'r5', name: 'Action Effectiveness Report', description: 'Impact measurement of completed corrective actions with before/after comparisons.', type: 'effectiveness' },
  ];
}

export function generateReportPreview(reportId: string, department?: string | null): { headers: string[]; rows: string[][] } {
  const isAll = !department || department === 'ALL' || department === 'all' || department === 'All Departments';

  const previews: Record<string, { headers: string[]; rows: string[][] }> = {
    r1: {
      headers: ['Time', 'Category', 'Sentiment', 'Issue', 'Status'],
      rows: [
        ['09:15 AM', 'Laboratory', 'Negative', 'Laboratory Wi-Fi', 'Under Review'],
        ['09:32 AM', 'Teaching', 'Positive', 'No Issue', 'Resolved'],
        ['10:05 AM', 'Hostel', 'Negative', 'Hostel Water Supply', 'Received'],
        ['10:42 AM', 'Canteen', 'Neutral', 'Canteen Food Quality', 'Received'],
        ['11:18 AM', 'Transport', 'Negative', 'Transport Timing', 'Action Planned'],
      ],
    },
    r2: {
      headers: ['Department', 'Feedback', 'Positive %', 'Negative %', 'Issues', 'Resolution Rate'],
      rows: isAll
        ? [
            ['Information Technology', '294', '84%', '9%', '11', '81%'],
            ['Cyber Security', '265', '81%', '11%', '13', '79%'],
            ['Computer Science and Business Engineering', '240', '83%', '10%', '12', '80%'],
            ['Biotechnology and Biomedical Engineering', '210', '86%', '8%', '9', '85%'],
            ['Artificial Intelligence & Data Science', '287', '82%', '10%', '14', '78%'],
            ['Computer Science & Engineering', '312', '79%', '12%', '16', '72%'],
            ['Electronics & Communication Engineering', '245', '75%', '18%', '12', '68%'],
            ['Mechanical Engineering', '198', '71%', '22%', '10', '65%'],
            ['Civil Engineering', '206', '80%', '11%', '8', '82%'],
          ]
        : [
            [department!, '100', '82%', '11%', '6', '84%'],
          ],
    },
    r3: {
      headers: ['Metric', 'This Month', 'Last Month', 'Change'],
      rows: [
        ['Total Feedback', '4,872', '4,512', '+8%'],
        ['Satisfaction', '82%', '78%', '+4 pts'],
        ['Critical Issues', '6', '9', '-33%'],
        ['Actions Completed', '12', '8', '+50%'],
        ['Avg Resolution Time', '4.2 days', '5.1 days', '-18%'],
      ],
    },
    r4: {
      headers: ['Issue', 'Severity', 'Complaints', 'Negative %', 'Possible Cause'],
      rows: [
        ['Laboratory Wi-Fi', 'Critical', '37', '82%', 'Network Congestion'],
        ['Hostel Water Supply', 'Critical', '29', '78%', 'Inadequate Storage'],
        ['Slow Lab Computers', 'High', '24', '68%', 'Outdated Hardware'],
        ['Placement Training', 'High', '19', '65%', 'Insufficient Mock Sessions'],
      ],
    },
    r5: {
      headers: ['Action', 'Issue', 'Before %', 'After %', 'Improvement'],
      rows: [
        ['Vendor Change', 'Canteen Food Quality', '65%', '27%', '+38 pts'],
        ['Seating Expansion', 'Library Seating', '58%', '15%', '+43 pts'],
        ['Hardware Upgrade', 'Slow Lab Computers', '72%', '31%', '+41 pts'],
      ],
    },
  };
  return previews[reportId] || previews.r1;
}
