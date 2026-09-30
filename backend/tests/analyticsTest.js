/**
 * Comprehensive Automated Test Suite for Phase 5:
 * Departmental Analytics, Trend Aggregations & Reporting APIs
 * 
 * Tests 25 distinct scenarios:
 * 1. Dashboard metrics calculation from live database
 * 2. Deterministic Pulse score formula and components (0-100)
 * 3. "What Changed Today" delta analysis and cards
 * 4. 7-day continuous trend series aggregation
 * 5. 30-day continuous trend series aggregation
 * 6. Theme aggregation with percentages, average ratings, and sparklines
 * 7. Issue tracking aggregation with complaint volume and emerging status
 * 8. Root-cause intelligence aggregation with confidence and evidence
 * 9. Sentiment distribution accuracy (positive + neutral + negative = total)
 * 10. Priority distribution accuracy (critical, high, medium, low)
 * 11. Management department comparison across all 9 official departments
 * 12. Management filtering by specific department
 * 13. HOD department isolation enforcement (default to HOD department)
 * 14. HOD cannot override department with query params (403 Forbidden)
 * 15. Civil HOD sees only Civil Engineering data
 * 16. CSE HOD sees only Computer Science & Engineering data
 * 17. Management sees institution-wide data by default
 * 18. Student cannot access administrative analytics (403 Forbidden)
 * 19. Invalid department rejected with 400 Bad Request
 * 20. Zero-data edge cases handled without NaN or division by zero
 * 21. Report summary endpoint preview data (r1)
 * 22. Report department endpoint preview data (r2)
 * 23. Report issues endpoint preview data (r4)
 * 24. Report actions endpoint preview data (r5)
 * 25. Cross-endpoint metrics consistency between dashboard, trends, and reports
 */

const BASE_URL = 'http://localhost:5000/api';

async function runAnalyticsTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING PHASE 5 ANALYTICS & REPORTING AUTOMATED TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      if (details) console.error(`   Details: ${details}`);
      failed++;
    }
  }

  // Helper to log in users
  async function login(email, password, role) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role })
    });
    const json = await res.json();
    if (!json.success || !json.data?.token) {
      throw new Error(`Failed to log in ${email} as ${role}: ${json.message || res.statusText}`);
    }
    return json.data.token;
  }

  // Log in demo accounts
  const studentToken = await login('student.it@college.edu', 'password123', 'student');
  const civilHodToken = await login('hod.civil@college.edu', 'password123', 'hod');
  const cseHodToken = await login('hod.cse@college.edu', 'password123', 'hod');
  const mgtToken = await login('management@college.edu', 'password123', 'management');

  console.log('--- A. Dashboard & Pulse Metrics ---');

  // Test 1: Dashboard metrics calculation from live database
  const dashRes = await fetch(`${BASE_URL}/analytics/dashboard`, {
    headers: { Authorization: `Bearer ${mgtToken}` }
  });
  const dashJson = await dashRes.json();
  assert(
    dashRes.status === 200 &&
    dashJson.success === true &&
    dashJson.data?.kpis &&
    typeof dashJson.data.kpis.totalFeedback === 'number' &&
    typeof dashJson.data.kpis.averageRating === 'number' &&
    Array.isArray(dashJson.data.topThemes) &&
    Array.isArray(dashJson.data.topIssues),
    '1. Dashboard metrics calculation from database returns structured KPIs and arrays',
    JSON.stringify(dashJson)
  );

  // Test 2: Deterministic Pulse score calculation
  const pulseRes = await fetch(`${BASE_URL}/analytics/pulse`, {
    headers: { Authorization: `Bearer ${mgtToken}` }
  });
  const pulseJson = await pulseRes.json();
  const pulse = pulseJson.data;
  assert(
    pulseRes.status === 200 &&
    typeof pulse.score === 'number' &&
    pulse.score >= 0 && pulse.score <= 100 &&
    ['improving', 'stable', 'declining'].includes(pulse.trend) &&
    typeof pulse.previousScore === 'number' &&
    typeof pulse.components?.sentimentContribution === 'number' &&
    typeof pulse.components?.ratingContribution === 'number' &&
    typeof pulse.components?.negativePenalty === 'number' &&
    typeof pulse.components?.issuePenalty === 'number' &&
    typeof pulse.explanation === 'string' && pulse.explanation.length > 0,
    '2. Deterministic Pulse score calculation satisfies formula constraints and 0-100 scale',
    `Score: ${pulse.score}, Trend: ${pulse.trend}`
  );

  // Test 3: "What Changed Today" delta analysis
  const summaryRes = await fetch(`${BASE_URL}/analytics/summary`, {
    headers: { Authorization: `Bearer ${mgtToken}` }
  });
  const summaryJson = await summaryRes.json();
  assert(
    summaryRes.status === 200 &&
    summaryJson.success === true &&
    typeof summaryJson.data.summary === 'string' &&
    typeof summaryJson.data.metrics.feedbackDeltaPct === 'number' &&
    ['up', 'down', 'neutral'].includes(summaryJson.data.metrics.feedbackDirection) &&
    Array.isArray(summaryJson.data.cards) &&
    Array.isArray(summaryJson.data.timeline),
    '3. "What Changed Today" returns delta metrics, activity cards, and timeline',
    JSON.stringify(summaryJson.data.metrics)
  );

  console.log('\n--- B. Time-Series Trends & Categorical Aggregations ---');

  // Test 4: 7-day trend series aggregation
  const trend7Res = await fetch(`${BASE_URL}/analytics/trends?days=7`, {
    headers: { Authorization: `Bearer ${mgtToken}` }
  });
  const trend7Json = await trend7Res.json();
  assert(
    trend7Res.status === 200 &&
    trend7Json.data.days === 7 &&
    Array.isArray(trend7Json.data.series) &&
    trend7Json.data.series.length === 7 &&
    typeof trend7Json.data.series[0].total === 'number' &&
    typeof trend7Json.data.series[0].date === 'string',
    '4. 7-day trend series aggregation returns continuous 7 daily data points',
    `Length: ${trend7Json.data?.series?.length}`
  );

  // Test 5: 30-day trend series aggregation
  const trend30Res = await fetch(`${BASE_URL}/analytics/trends?days=30`, {
    headers: { Authorization: `Bearer ${mgtToken}` }
  });
  const trend30Json = await trend30Res.json();
  assert(
    trend30Res.status === 200 &&
    trend30Json.data.days === 30 &&
    Array.isArray(trend30Json.data.series) &&
    trend30Json.data.series.length === 30,
    '5. 30-day trend series aggregation returns continuous 30 daily data points',
    `Length: ${trend30Json.data?.series?.length}`
  );

  // Test 6: Theme aggregation & breakdown
  const themeRes = await fetch(`${BASE_URL}/analytics/themes`, {
    headers: { Authorization: `Bearer ${mgtToken}` }
  });
  const themeJson = await themeRes.json();
  assert(
    themeRes.status === 200 &&
    Array.isArray(themeJson.data.themes) &&
    themeJson.data.themes.every(t => 
      typeof t.name === 'string' &&
      typeof t.responses === 'number' &&
      typeof t.positivePercent === 'number' &&
      typeof t.negativePercent === 'number' &&
      Array.isArray(t.trend) && t.trend.length === 7 &&
      ['critical', 'high', 'medium', 'low'].includes(t.priority)
    ),
    '6. Theme aggregation provides category volume, percentage, 7-day sparkline, and priority',
    `Theme count: ${themeJson.data?.themes?.length}`
  );

  // Test 7: Issue aggregation with status & priority
  const issueRes = await fetch(`${BASE_URL}/analytics/issues`, {
    headers: { Authorization: `Bearer ${mgtToken}` }
  });
  const issueJson = await issueRes.json();
  assert(
    issueRes.status === 200 &&
    Array.isArray(issueJson.data.issues) &&
    issueJson.data.issues.every(i =>
      typeof i.id === 'string' &&
      typeof i.title === 'string' &&
      typeof i.department === 'string' &&
      ['critical', 'high', 'medium', 'low'].includes(i.priority) &&
      typeof i.complaintCount === 'number' &&
      typeof i.negativePercent === 'number' &&
      typeof i.isEmerging === 'boolean'
    ),
    '7. Issue aggregation returns complaints, negative %, priority, and emerging status',
    `Issue count: ${issueJson.data?.issues?.length}`
  );

  // Test 8: Root-cause aggregation & evidence
  const rcRes = await fetch(`${BASE_URL}/analytics/root-causes`, {
    headers: { Authorization: `Bearer ${mgtToken}` }
  });
  const rcJson = await rcRes.json();
  assert(
    rcRes.status === 200 &&
    Array.isArray(rcJson.data.rootCauses) &&
    rcJson.data.rootCauses.every(rc =>
      typeof rc.factor === 'string' &&
      ['high', 'medium', 'low'].includes(rc.likelihood) &&
      ['high', 'moderate', 'low'].includes(rc.confidence) &&
      Array.isArray(rc.evidence) &&
      typeof rc.supportingCount === 'number'
    ),
    '8. Root-cause aggregation returns calibrated confidence, likelihood, and evidence',
    `Root causes count: ${rcJson.data?.rootCauses?.length}`
  );

  // Test 9: Sentiment distribution accuracy
  const totalFb = dashJson.data.kpis.totalFeedback;
  const sentDist = dashJson.data.sentimentDistribution;
  const sentSum = sentDist.positive + sentDist.neutral + sentDist.negative;
  assert(
    totalFb === sentSum,
    '9. Sentiment distribution count matches total feedback exactly',
    `Total: ${totalFb}, Sum: ${sentSum}`
  );

  // Test 10: Priority distribution accuracy
  const prioDist = dashJson.data.priorityDistribution;
  const prioSum = prioDist.critical + prioDist.high + prioDist.medium + prioDist.low;
  assert(
    totalFb === prioSum,
    '10. Priority distribution count matches total feedback exactly',
    `Total: ${totalFb}, Priority Sum: ${prioSum}`
  );

  console.log('\n--- C. Department Comparison & Scoping Security ---');

  // Test 11: Department comparison (all 9 official departments for Management)
  const compRes = await fetch(`${BASE_URL}/analytics/department-comparison`, {
    headers: { Authorization: `Bearer ${mgtToken}` }
  });
  const compJson = await compRes.json();
  assert(
    compRes.status === 200 &&
    compJson.data.totalDepartments === 9 &&
    Array.isArray(compJson.data.departments) &&
    compJson.data.departments.length === 9 &&
    compJson.data.benchmarks &&
    typeof compJson.data.benchmarks.institutionAverageSatisfaction === 'number',
    '11. Department comparison returns matrix of all 9 official departments with benchmarks',
    `Depts: ${compJson.data?.departments?.length}`
  );

  // Test 12: Management filtering by specific department
  const mgtFilterRes = await fetch(`${BASE_URL}/analytics/dashboard?department=Information%20Technology`, {
    headers: { Authorization: `Bearer ${mgtToken}` }
  });
  const mgtFilterJson = await mgtFilterRes.json();
  assert(
    mgtFilterRes.status === 200 &&
    mgtFilterJson.data.department === 'Information Technology',
    '12. Management can filter analytics dashboard by specific official department',
    `Returned dept: ${mgtFilterJson.data?.department}`
  );

  // Test 13: HOD department isolation enforcement
  const civilRes = await fetch(`${BASE_URL}/analytics/dashboard`, {
    headers: { Authorization: `Bearer ${civilHodToken}` }
  });
  const civilJson = await civilRes.json();
  assert(
    civilRes.status === 200 &&
    civilJson.data.department === 'Civil Engineering',
    '13. HOD request without parameters automatically scopes to HOD assigned department',
    `Returned dept: ${civilJson.data?.department}`
  );

  // Test 14: HOD cannot override department with query params (403 Forbidden)
  const overrideRes = await fetch(`${BASE_URL}/analytics/dashboard?department=Computer%20Science%20%26%20Engineering`, {
    headers: { Authorization: `Bearer ${civilHodToken}` }
  });
  assert(
    overrideRes.status === 403,
    '14. HOD attempting to query a different department receives 403 Forbidden',
    `Status: ${overrideRes.status}`
  );

  // Test 15: Civil HOD sees only Civil Engineering data
  const civilPulseRes = await fetch(`${BASE_URL}/analytics/pulse`, {
    headers: { Authorization: `Bearer ${civilHodToken}` }
  });
  const civilPulseJson = await civilPulseRes.json();
  assert(
    civilPulseRes.status === 200 &&
    civilPulseJson.data.department === 'Civil Engineering',
    '15. Civil HOD receives Pulse metrics strictly isolated to Civil Engineering',
    `Dept: ${civilPulseJson.data?.department}`
  );

  // Test 16: CSE HOD sees only CSE data
  const cseRes = await fetch(`${BASE_URL}/analytics/dashboard`, {
    headers: { Authorization: `Bearer ${cseHodToken}` }
  });
  const cseJson = await cseRes.json();
  assert(
    cseRes.status === 200 &&
    cseJson.data.department === 'Computer Science & Engineering',
    '16. CSE HOD receives dashboard metrics strictly isolated to Computer Science & Engineering',
    `Dept: ${cseJson.data?.department}`
  );

  // Test 17: Management sees institution-wide data by default
  const mgtAllRes = await fetch(`${BASE_URL}/analytics/dashboard`, {
    headers: { Authorization: `Bearer ${mgtToken}` }
  });
  const mgtAllJson = await mgtAllRes.json();
  assert(
    mgtAllRes.status === 200 &&
    mgtAllJson.data.department === 'All Departments',
    '17. Management receives institution-wide data by default',
    `Dept: ${mgtAllJson.data?.department}`
  );

  // Test 18: Student cannot access administrative analytics (403 Forbidden)
  const studentForbiddenRes = await fetch(`${BASE_URL}/analytics/dashboard`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(
    studentForbiddenRes.status === 403,
    '18. Student role attempting to access analytics is blocked with 403 Forbidden',
    `Status: ${studentForbiddenRes.status}`
  );

  // Test 19: Invalid department rejected with 400 Bad Request
  const invalidDeptRes = await fetch(`${BASE_URL}/analytics/dashboard?department=NonExistentDepartment`, {
    headers: { Authorization: `Bearer ${mgtToken}` }
  });
  assert(
    invalidDeptRes.status === 400,
    '19. Invalid department name queried by management is rejected with 400 Bad Request',
    `Status: ${invalidDeptRes.status}`
  );

  // Test 20: Zero-data edge cases handled without NaN or division by zero
  const zeroDataRes = await fetch(`${BASE_URL}/analytics/pulse?department=Mechanical%20Engineering`, {
    headers: { Authorization: `Bearer ${mgtToken}` }
  });
  const zeroDataJson = await zeroDataRes.json();
  assert(
    zeroDataRes.status === 200 &&
    typeof zeroDataJson.data.score === 'number' &&
    !isNaN(zeroDataJson.data.score) &&
    zeroDataJson.data.components &&
    !isNaN(zeroDataJson.data.components.sentimentContribution),
    '20. Department returns valid pulse score without NaN or division by zero',
    JSON.stringify(zeroDataJson.data)
  );

  console.log('\n--- D. Reporting API Previews & Consistency ---');

  // Test 21: Report summary endpoint preview data (r1)
  const repSummaryRes = await fetch(`${BASE_URL}/reports/summary`, {
    headers: { Authorization: `Bearer ${mgtToken}` }
  });
  const repSummaryJson = await repSummaryRes.json();
  assert(
    repSummaryRes.status === 200 &&
    repSummaryJson.data.reportType === 'daily' &&
    Array.isArray(repSummaryJson.data.headers) &&
    Array.isArray(repSummaryJson.data.rows) &&
    repSummaryJson.data.headers.includes('Sentiment'),
    '21. Report summary endpoint returns structured table preview for Daily Summary',
    `Headers: ${repSummaryJson.data?.headers?.join(', ')}`
  );

  // Test 22: Report department endpoint preview data (r2)
  const repDeptRes = await fetch(`${BASE_URL}/reports/department`, {
    headers: { Authorization: `Bearer ${mgtToken}` }
  });
  const repDeptJson = await repDeptRes.json();
  assert(
    repDeptRes.status === 200 &&
    repDeptJson.data.reportType === 'weekly' &&
    Array.isArray(repDeptJson.data.headers) &&
    Array.isArray(repDeptJson.data.rows) &&
    repDeptJson.data.headers.includes('Resolution Rate'),
    '22. Report department endpoint returns structured table preview for Weekly Department',
    `Headers: ${repDeptJson.data?.headers?.join(', ')}`
  );

  // Test 23: Report issues endpoint preview data (r4)
  const repIssuesRes = await fetch(`${BASE_URL}/reports/issues`, {
    headers: { Authorization: `Bearer ${mgtToken}` }
  });
  const repIssuesJson = await repIssuesRes.json();
  assert(
    repIssuesRes.status === 200 &&
    repIssuesJson.data.reportType === 'critical' &&
    Array.isArray(repIssuesJson.data.headers) &&
    Array.isArray(repIssuesJson.data.rows) &&
    repIssuesJson.data.headers.includes('Possible Cause'),
    '23. Report issues endpoint returns structured table preview for Critical Issues',
    `Headers: ${repIssuesJson.data?.headers?.join(', ')}`
  );

  // Test 24: Report actions endpoint preview data (r5)
  const repActionsRes = await fetch(`${BASE_URL}/reports/actions`, {
    headers: { Authorization: `Bearer ${mgtToken}` }
  });
  const repActionsJson = await repActionsRes.json();
  assert(
    repActionsRes.status === 200 &&
    repActionsJson.data.reportType === 'effectiveness' &&
    Array.isArray(repActionsJson.data.headers) &&
    Array.isArray(repActionsJson.data.rows) &&
    repActionsJson.data.headers.includes('Cost'),
    '24. Report actions endpoint returns structured table preview for Action Effectiveness',
    `Headers: ${repActionsJson.data?.headers?.join(', ')}`
  );

  // Test 25: Cross-endpoint metrics consistency
  // Compare total feedback in dashboard vs total feedback aggregated across theme breakdown
  const themeTotalSum = themeJson.data.themes.reduce((acc, t) => acc + t.responses, 0);
  assert(
    totalFb === themeTotalSum,
    '25. Cross-endpoint metrics consistency verified (Dashboard totalFeedback matches Theme totalResponses)',
    `Dashboard Total: ${totalFb}, Themes Sum: ${themeTotalSum}`
  );

  console.log('\n====================================================');
  console.log(`📊 PHASE 5 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (Total: ${passed + failed})`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAnalyticsTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
