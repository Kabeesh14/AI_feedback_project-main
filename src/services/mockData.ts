import type {
  Feedback,
  Issue,
  Alert,
  Action,
  Theme,
  Notification,
  DepartmentMetric,
  CampusArea,
  Department,
  Category,
  Sentiment,
  Severity,
  Year,
} from '@/types';

const departments: Department[] = [
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
const categories: Category[] = [
  'Teaching', 'Laboratory', 'Internet', 'Infrastructure',
  'Hostel', 'Canteen', 'Transport', 'Placement', 'Library', 'Examination',
];
const years: Year[] = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
const locations = ['Block A', 'Block B', 'Main Building', 'Lab Wing', 'Hostel Block', 'Library Floor', 'Canteen Area', 'Transport Hub'];

const issueTemplates: Record<string, { issue: string; severity: Severity; keywords: string[]; cluster: string[] }> = {
  'Laboratory': {
    issue: 'Slow Laboratory Computers',
    severity: 'high',
    keywords: ['slow', 'outdated', 'lag', 'performance', 'hardware'],
    cluster: [
      'Computers are very slow during practical sessions.',
      'Systems take too long to boot and lag during coding.',
      'Lab PCs are outdated and need replacement.',
    ],
  },
  'Internet': {
    issue: 'Laboratory Wi-Fi',
    severity: 'critical',
    keywords: ['slow', 'disconnect', 'signal', 'network', 'practical'],
    cluster: [
      'Wi-Fi disconnects during practical sessions.',
      'Lab internet becomes very slow when many students connect.',
      'Unable to access online resources during lab hours.',
    ],
  },
  'Hostel': {
    issue: 'Hostel Water Supply',
    severity: 'critical',
    keywords: ['water', 'supply', 'morning', 'hostel', 'shortage'],
    cluster: [
      'No water supply in hostel during morning hours.',
      'Water pressure is very low in the hostel bathrooms.',
      'Hostel faces water shortage every other day.',
    ],
  },
  'Canteen': {
    issue: 'Canteen Food Quality',
    severity: 'medium',
    keywords: ['quality', 'taste', 'hygiene', 'food', 'stale'],
    cluster: [
      'Canteen food quality has declined recently.',
      'The food sometimes feels stale and unhygienic.',
      'Prices increased but quality went down.',
    ],
  },
  'Transport': {
    issue: 'Transport Timing',
    severity: 'medium',
    keywords: ['timing', 'late', 'early', 'bus', 'irregular'],
    cluster: [
      'Buses arrive late almost every day.',
      'Transport timing is irregular and unreliable.',
      'Bus comes too early, students miss it frequently.',
    ],
  },
  'Placement': {
    issue: 'Placement Training',
    severity: 'high',
    keywords: ['training', 'aptitude', 'mock', 'interview', 'placement'],
    cluster: [
      'Placement training is not adequate for interviews.',
      'Need more mock interviews and aptitude practice.',
      'Placement preparation sessions are too few.',
    ],
  },
  'Library': {
    issue: 'Library Seating',
    severity: 'low',
    keywords: ['seating', 'space', 'crowded', 'study', 'chairs'],
    cluster: [
      'Library is always crowded, no seating available.',
      'Need more study space in the library.',
      'Chairs are broken in the reading room.',
    ],
  },
  'Teaching': {
    issue: 'Teaching Methodology',
    severity: 'medium',
    keywords: ['method', 'practical', 'theory', 'engagement', 'examples'],
    cluster: [
      'Teaching is too theoretical, need more practical examples.',
      'Some faculty rush through topics without engagement.',
      'Classes feel monotonous and lack interactive sessions.',
    ],
  },
  'Infrastructure': {
    issue: 'Classroom Infrastructure',
    severity: 'medium',
    keywords: ['projector', 'ac', 'ventilation', 'benches', 'maintenance'],
    cluster: [
      'Projectors in classrooms frequently do not work.',
      'AC is not functioning in several classrooms.',
      'Benches are broken and need maintenance.',
    ],
  },
  'Examination': {
    issue: 'Exam Schedule Clarity',
    severity: 'low',
    keywords: ['schedule', 'clarity', 'notification', 'timing', 'exam'],
    cluster: [
      'Exam schedules are announced too late.',
      'Exam hall allocations are unclear until the last minute.',
      'Need better communication about exam patterns.',
    ],
  },
};

const positiveComments: Record<string, string[]> = {
  'Teaching': ['Teaching is excellent and engaging.', 'Faculty explains concepts very clearly.', 'Love the interactive teaching style.'],
  'Laboratory': ['Lab sessions are well organized.', 'Lab equipment is in good condition.', 'Lab assistants are very helpful.'],
  'Internet': ['Campus Wi-Fi has been great lately.', 'Internet speed is good in the library.', 'No connectivity issues this week.'],
  'Infrastructure': ['Classrooms are clean and well-maintained.', 'New benches are comfortable.', 'Campus facilities are improving.'],
  'Hostel': ['Hostel rooms are clean and comfortable.', 'Hostel maintenance is responsive.', 'Hostel food has improved.'],
  'Canteen': ['Canteen food is tasty and affordable.', 'Good variety in the canteen menu.', 'Canteen hygiene has improved.'],
  'Transport': ['Bus service is punctual and reliable.', 'Transport routes are convenient.', 'Bus drivers are professional.'],
  'Placement': ['Placement training is very helpful.', 'Good placement opportunities this year.', 'Mock interviews boosted my confidence.'],
  'Library': ['Library has a great collection of books.', 'Library environment is perfect for studying.', 'Digital library resources are excellent.'],
  'Examination': ['Exam process was smooth and fair.', 'Exam schedules were communicated well.', 'Question paper pattern was clear.'],
};

const neutralComments: Record<string, string[]> = {
  'Teaching': ['Teaching is okay, could be more interactive.', 'Classes are fine but sometimes rushed.'],
  'Laboratory': ['Lab sessions are average.', 'Some equipment works, some does not.'],
  'Internet': ['Internet is fine most of the time.', 'Wi-Fi is okay but slow during peak hours.'],
  'Infrastructure': ['Classrooms are decent.', 'Some facilities need minor repairs.'],
  'Hostel': ['Hostel is manageable.', 'Room is okay but could be better.'],
  'Canteen': ['Canteen food is average.', 'Food is okay, nothing special.'],
  'Transport': ['Bus is usually on time.', 'Transport is okay but could improve.'],
  'Placement': ['Placement training is decent.', 'Some training sessions are useful.'],
  'Library': ['Library is fine for studying.', 'Could use more seating.'],
  'Examination': ['Exams were conducted properly.', 'Exam process was standard.'],
};

function randomDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(Math.floor(Math.random() * 12) + 8, Math.floor(Math.random() * 60), 0, 0);
  return date.toISOString();
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedSentiment(): Sentiment {
  const r = Math.random();
  if (r < 0.55) return 'positive';
  if (r < 0.8) return 'negative';
  return 'neutral';
}

export function generateFeedback(count: number = 900): Feedback[] {
  const feedback: Feedback[] = [];
  const perDept = Math.max(10, Math.floor(count / departments.length));

  departments.forEach((dept) => {
    for (let i = 0; i < perDept; i++) {
      const category = pick(categories);
      const sentiment = weightedSentiment();
      const year = pick(years);
      const daysAgo = Math.floor(Math.random() * 14);
      const template = issueTemplates[category];

      let comment: string;
      let issue: string;
      let severity: Severity;
      let theme: string;
      let status: Feedback['status'];

      if (sentiment === 'positive') {
        comment = pick(positiveComments[category] || ['Good experience overall.']);
        issue = 'No Issue';
        severity = 'low';
        theme = category;
        status = 'resolved';
      } else if (sentiment === 'neutral') {
        comment = pick(neutralComments[category] || ['It was okay.']);
        issue = template ? template.issue : 'General Feedback';
        severity = 'low';
        theme = category;
        status = pick(['received', 'under_review'] as Feedback['status'][]);
      } else {
        comment = pick(template.cluster);
        issue = template.issue;
        severity = template.severity;
        theme = category;
        const sr = Math.random();
        if (sr < 0.2) status = 'received';
        else if (sr < 0.4) status = 'under_review';
        else if (sr < 0.55) status = 'action_planned';
        else if (sr < 0.8) status = 'in_progress';
        else status = 'resolved';
      }

      feedback.push({
        id: `fb-${dept.replace(/\s+/g, '-').toLowerCase()}-${i + 1}`,
        date: randomDate(daysAgo),
        department: dept,
        year,
        category,
        comment,
        sentiment,
        theme,
        issue,
        severity,
        status,
        anonymous: Math.random() < 0.4,
        studentId: `STU-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      });
    }
  });

  return feedback.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function generateIssues(): Issue[] {
  const issues: Issue[] = [];
  let issueCounter = 1;

  departments.forEach((dept) => {
    // 6 distinct relevant categories for each department
    const deptCategories: Category[] = [
      'Laboratory',
      'Internet',
      'Infrastructure',
      'Teaching',
      'Hostel',
      'Placement',
    ];

    deptCategories.forEach((category) => {
      const template = issueTemplates[category];
      if (!template) return;
      const complaintCount = Math.floor(Math.random() * 25) + 8;
      const slug = dept.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
      const id = `issue-${slug}-${issueCounter++}`;

      issues.push({
        id,
        title: template.issue,
        category,
        severity: template.severity,
        complaintCount,
        negativePercent: Math.floor(Math.random() * 25) + 65,
        trend: Array.from({ length: 7 }, () => Math.floor(Math.random() * 8) + 1),
        affectedYears: years.filter(() => Math.random() > 0.3),
        affectedLocations: locations.filter(() => Math.random() > 0.5),
        department: dept,
        keywords: template.keywords,
        cluster: template.cluster,
        status: pick(['received', 'under_review', 'action_planned', 'in_progress', 'resolved'] as Feedback['status'][]),
        priorityScore: Math.floor(Math.random() * 40) + 60,
      });
    });
  });

  return issues;
}

export function generateAlerts(): Alert[] {
  const alerts: Alert[] = [];

  departments.forEach((dept) => {
    const slug = dept.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    alerts.push(
      {
        id: `alert-${slug}-1`,
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        severity: 'critical',
        issue: 'Laboratory Wi-Fi',
        reason: `${dept}: Wi-Fi complaints increased 240% during lab hours.`,
        department: dept,
        read: false,
        issueId: `issue-${slug}-2`,
      },
      {
        id: `alert-${slug}-2`,
        timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        severity: 'critical',
        issue: 'Hostel Water Supply',
        reason: `${dept}: Water supply disruption reported by students.`,
        department: dept,
        read: false,
        issueId: `issue-${slug}-5`,
      },
      {
        id: `alert-${slug}-3`,
        timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        severity: 'warning',
        issue: 'Slow Laboratory Computers',
        reason: `${dept}: Workstation performance complaints rising across practical batches.`,
        department: dept,
        read: false,
        issueId: `issue-${slug}-1`,
      },
      {
        id: `alert-${slug}-4`,
        timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
        severity: 'success',
        issue: 'Canteen Food Quality',
        reason: `${dept}: Complaints down 38% after vendor quality review.`,
        department: dept,
        read: true,
        issueId: `issue-${slug}-4`,
      }
    );
  });

  return alerts;
}

export function generateActions(): Action[] {
  const actions: Action[] = [];

  departments.forEach((dept) => {
    const slug = dept.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    actions.push(
      {
        id: `action-${slug}-1`,
        issueId: `issue-${slug}-1`,
        issueTitle: 'Slow Laboratory Computers',
        possibleCause: 'Outdated hardware and insufficient RAM',
        action: `Upgrade ${dept} lab workstations with additional RAM and SSDs`,
        assignedTo: `${dept} Lab In-charge`,
        deadline: '2026-09-30',
        status: 'in_progress',
        createdAt: '2026-08-20',
        department: dept,
        impact: { beforeNegative: 74, afterNegative: 28, improvement: 46 },
      },
      {
        id: `action-${slug}-2`,
        issueId: `issue-${slug}-2`,
        issueTitle: 'Laboratory Wi-Fi',
        possibleCause: 'Network congestion and insufficient access point coverage',
        action: `Install dedicated high-speed access points for ${dept} laboratories`,
        assignedTo: 'IT Infrastructure Team',
        deadline: '2026-09-15',
        status: 'planned',
        createdAt: '2026-08-28',
        department: dept,
      },
      {
        id: `action-${slug}-3`,
        issueId: `issue-${slug}-5`,
        issueTitle: 'Hostel Water Supply',
        possibleCause: 'Inadequate water storage and pump schedule mismatch',
        action: 'Recalibrate automated pumping schedule and clean rooftop reservoirs',
        assignedTo: 'Campus Facilities',
        deadline: '2026-08-25',
        status: 'completed',
        createdAt: '2026-08-05',
        department: dept,
        impact: { beforeNegative: 68, afterNegative: 22, improvement: 46 },
      },
      {
        id: `action-${slug}-4`,
        issueId: `issue-${slug}-6`,
        issueTitle: 'Placement Training',
        possibleCause: 'Insufficient domain-specific mock interview sessions',
        action: `Organize weekly industry mock interviews focused on ${dept} specializations`,
        assignedTo: 'Placement Cell & HOD',
        deadline: '2026-09-10',
        status: 'in_progress',
        createdAt: '2026-08-22',
        department: dept,
      }
    );
  });

  return actions;
}

export function generateThemes(): Theme[] {
  return categories.map((cat) => {
    const responses = Math.floor(Math.random() * 80) + 20;
    const positivePercent = Math.floor(Math.random() * 40) + 40;
    const negativePercent = Math.floor(Math.random() * 30) + 10;
    const severities: Severity[] = ['low', 'medium', 'high', 'critical'];
    return {
      name: cat,
      category: cat,
      responses,
      positivePercent,
      negativePercent,
      trend: Array.from({ length: 7 }, () => Math.floor(Math.random() * 20) + 5),
      priority: pick(severities),
    };
  });
}

export function generateNotifications(): Notification[] {
  return [
    { id: 'n1', type: 'critical_issue', title: 'New Critical Issue Detected', message: 'Laboratory Wi-Fi complaints have spiked 240% in 3 days.', timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(), read: false },
    { id: 'n2', type: 'recurring_issue', title: 'Recurring Issue Detected', message: 'Hostel Water Supply complaints continue for 5 consecutive days.', timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), read: false },
    { id: 'n3', type: 'action_created', title: 'New Action Created', message: 'Action "Install additional access points" created for Laboratory Wi-Fi.', timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), read: false },
    { id: 'n4', type: 'improvement', title: 'Issue Improvement Detected', message: 'Canteen Food Quality complaints reduced by 38% after vendor change.', timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(), read: true },
    { id: 'n5', type: 'deadline', title: 'Action Deadline Approaching', message: 'Placement Training action due in 9 days.', timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), read: true },
  ];
}

export function generateDepartmentMetrics(): DepartmentMetric[] {
  return departments.map((dept) => ({
    department: dept,
    satisfaction: Math.floor(Math.random() * 20) + 70,
    negativePercent: Math.floor(Math.random() * 15) + 8,
    issueCount: Math.floor(Math.random() * 20) + 5,
    resolutionRate: Math.floor(Math.random() * 30) + 60,
    improvementRate: Math.floor(Math.random() * 25) + 15,
    totalFeedback: Math.floor(Math.random() * 300) + 150,
  }));
}

export function generateCampusAreas(): CampusArea[] {
  return [
    { id: 'area-1', name: 'Laboratory Block', issueCount: 23, severity: 'high', feedbackCount: 87 },
    { id: 'area-2', name: 'Library', issueCount: 8, severity: 'low', feedbackCount: 42 },
    { id: 'area-3', name: 'Hostel', issueCount: 41, severity: 'critical', feedbackCount: 112 },
    { id: 'area-4', name: 'Canteen', issueCount: 15, severity: 'medium', feedbackCount: 65 },
    { id: 'area-5', name: 'Main Block', issueCount: 12, severity: 'medium', feedbackCount: 78 },
    { id: 'area-6', name: 'Placement Center', issueCount: 18, severity: 'high', feedbackCount: 54 },
    { id: 'area-7', name: 'Transport Zone', issueCount: 14, severity: 'medium', feedbackCount: 48 },
  ];
}
