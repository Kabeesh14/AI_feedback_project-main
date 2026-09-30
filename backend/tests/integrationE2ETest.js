/**
 * Automated End-to-End Frontend ↔ Backend Integration Test Suite
 * Tests actual HTTP REST API calls with JWT authentication, role boundaries,
 * and data flows across Student, Civil HOD, CSE HOD, and Management.
 */

const BASE_URL = 'http://localhost:5000/api';

async function runE2ETests() {
  console.log('====================================================');
  console.log('🌐 RUNNING FRONTEND ↔ BACKEND INTEGRATION E2E TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200 && healthData.database.status === 'connected', '1. Backend is healthy and MySQL is connected');

    // 2. Student Authentication
    const studentLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student.civil@college.edu', password: 'password123', role: 'student' })
    });
    const studentLoginData = await studentLoginRes.json();
    assert(studentLoginRes.status === 200 && !!studentLoginData.data.token, '2. Student login succeeds and returns JWT');
    const studentToken = studentLoginData.data.token;

    // 3. Session restore (GET /api/auth/me)
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const meData = await meRes.json();
    assert(meRes.status === 200 && meData.data.user.email === 'student.civil@college.edu' && meData.data.user.role === 'student', '3. GET /api/auth/me successfully restores student session');

    // 4. Student Feedback Submission
    const submitRes = await fetch(`${BASE_URL}/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        comment: 'Surveying equipment calibration is slightly inaccurate in laboratory bay 2.',
        rating: 2,
        category: 'Laboratory',
        anonymous: false,
        department: 'Civil Engineering'
      })
    });
    const submitData = await submitRes.json();
    assert(submitRes.status === 201 && submitData.success === true, '4. Student feedback submission succeeds immediately (HTTP 201)');
    const createdFeedbackId = submitData.data.id;

    // 5. Student History (GET /api/feedback/my)
    const myHistoryRes = await fetch(`${BASE_URL}/feedback/my`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const myHistoryData = await myHistoryRes.json();
    const hasCreatedItem = Array.isArray(myHistoryData.data) && myHistoryData.data.some(f => String(f.id) === String(createdFeedbackId));
    assert(myHistoryRes.status === 200 && hasCreatedItem, '5. Student history retrieves newly submitted feedback from MySQL');

    // 6. Student Security Restrictions
    const studentAlertsRes = await fetch(`${BASE_URL}/alerts`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert(studentAlertsRes.status === 403, '6. Student attempting to access /api/alerts receives 403 Forbidden');

    const studentAnalyticsRes = await fetch(`${BASE_URL}/analytics/dashboard`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert(studentAnalyticsRes.status === 403, '7. Student attempting to access /api/analytics/dashboard receives 403 Forbidden');

    // 7. Civil HOD Authentication
    const civilHodLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'hod.civil@college.edu', password: 'password123', role: 'hod' })
    });
    const civilHodData = await civilHodLoginRes.json();
    assert(civilHodLoginRes.status === 200 && !!civilHodData.data.token, '8. Civil HOD login succeeds');
    const civilHodToken = civilHodData.data.token;

    // 8. Civil HOD Department Scoping & Isolation
    const civilFeedbackRes = await fetch(`${BASE_URL}/feedback`, {
      headers: { Authorization: `Bearer ${civilHodToken}` }
    });
    const civilFeedbackData = await civilFeedbackRes.json();
    const allCivil = civilFeedbackData.data.every(f => f.department === 'Civil Engineering');
    assert(civilFeedbackRes.status === 200 && allCivil, '9. Civil HOD automatically receives only Civil Engineering feedback');

    const crossDeptRes = await fetch(`${BASE_URL}/feedback?department=Computer%20Science%20%26%20Engineering`, {
      headers: { Authorization: `Bearer ${civilHodToken}` }
    });
    assert(crossDeptRes.status === 403, '10. Civil HOD attempting cross-department query receives 403 Forbidden');

    // 9. Civil HOD Alerts & Action Creation
    const civilAlertsRes = await fetch(`${BASE_URL}/alerts`, {
      headers: { Authorization: `Bearer ${civilHodToken}` }
    });
    const civilAlertsData = await civilAlertsRes.json();
    assert(civilAlertsRes.status === 200 && !!civilAlertsData.data.alerts, '11. Civil HOD retrieves live departmental alerts');

    const createActionRes = await fetch(`${BASE_URL}/actions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${civilHodToken}`
      },
      body: JSON.stringify({
        title: 'Calibrate Total Stations and Theodolites in Lab 2',
        action: 'Calibrate Total Stations and Theodolites in Lab 2',
        department: 'Civil Engineering',
        assignedTo: 'Survey Lab Technician',
        deadline: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        status: 'planned',
        priority: 'medium'
      })
    });
    const createActionData = await createActionRes.json();
    assert(createActionRes.status === 201 && createActionData.data.department === 'Civil Engineering', '12. Civil HOD creates action in own department');
    const civilActionId = createActionData.data.id;

    // 10. Impact Tracking for Action
    const impactRes = await fetch(`${BASE_URL}/impact/${civilActionId}`, {
      headers: { Authorization: `Bearer ${civilHodToken}` }
    });
    const impactData = await impactRes.json();
    assert(impactRes.status === 200 && (impactData.data.dataSufficient === false || impactData.data.evaluation === 'insufficient_data'), '13. Impact tracking evaluates action and accurately returns insufficient_data for new planned action');

    // 11. CSE HOD Department Isolation
    const cseHodLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'hod.cse@college.edu', password: 'password123', role: 'hod' })
    });
    const cseHodData = await cseHodLoginRes.json();
    assert(cseHodLoginRes.status === 200 && cseHodData.data.user.department === 'Computer Science & Engineering', '14. CSE HOD login scoped to Computer Science & Engineering');

    // 12. Management Global Oversight & Comparison
    const mgtLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'management@college.edu', password: 'password123', role: 'management' })
    });
    const mgtData = await mgtLoginRes.json();
    assert(mgtLoginRes.status === 200 && mgtData.data.user.role === 'management', '15. Management login succeeds');
    const mgtToken = mgtData.data.token;

    const mgtDashboardRes = await fetch(`${BASE_URL}/analytics/dashboard`, {
      headers: { Authorization: `Bearer ${mgtToken}` }
    });
    const mgtDashboardData = await mgtDashboardRes.json();
    assert(mgtDashboardRes.status === 200 && (mgtDashboardData.data.kpis?.totalFeedback !== undefined || mgtDashboardData.data.totalFeedback !== undefined), '16. Management retrieves institutional dashboard metrics');

    const deptCompRes = await fetch(`${BASE_URL}/analytics/department-comparison`, {
      headers: { Authorization: `Bearer ${mgtToken}` }
    });
    const deptCompData = await deptCompRes.json();
    assert(deptCompRes.status === 200 && (deptCompData.data.departments?.length === 9 || deptCompData.data.matrix?.length === 9), '17. Management retrieves complete 9-department comparison matrix');

    const reportRes = await fetch(`${BASE_URL}/reports/summary`, {
      headers: { Authorization: `Bearer ${mgtToken}` }
    });
    const reportData = await reportRes.json();
    assert(reportRes.status === 200 && (reportData.data.headers?.length > 0 || reportData.data.summary !== undefined), '18. Report summary preview generated from active MySQL feedback data');

    // 13. Quick Demo Login Aliases
    const demoStudentRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@demo.com', password: 'password123', role: 'student' })
    });
    const demoStudentData = await demoStudentRes.json();
    assert(demoStudentRes.status === 200 && demoStudentData.data.user.role === 'student', '19. Demo student quick-sign-in alias succeeds');

    const demoHodRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'hod@demo.com', password: 'password123', role: 'hod' })
    });
    const demoHodData = await demoHodRes.json();
    assert(demoHodRes.status === 200 && demoHodData.data.user.role === 'hod', '20. Demo HOD quick-sign-in alias succeeds');

  } catch (error) {
    console.error('Fatal test error:', error);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`📊 INTEGRATION E2E TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (Total: ${passed + failed})`);
  console.log('====================================================');

  process.exit(failed > 0 ? 1 : 0);
}

runE2ETests();
