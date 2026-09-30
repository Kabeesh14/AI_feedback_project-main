/**
 * Comprehensive Automated Test Suite for Phase 6:
 * Impact Tracking (Before/After Window Metrics, Effectiveness Evaluation, Insufficient Data, Department Scoping)
 */

const BASE_URL = 'http://localhost:5000/api';

async function runImpactTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING PHASE 6 IMPACT TRACKING AUTOMATED TESTS');
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
      throw new Error(`Failed to log in ${email}: ${json.message || res.statusText}`);
    }
    return json.data.token;
  }

  // Log in demo accounts
  const studentToken = await login('student.it@college.edu', 'password123', 'student');
  const civilHodToken = await login('hod.civil@college.edu', 'password123', 'hod');
  const cseHodToken = await login('hod.cse@college.edu', 'password123', 'hod');
  const mgtToken = await login('management@college.edu', 'password123', 'management');

  // Fetch actions to test impact on
  const actionsRes = await fetch(`${BASE_URL}/actions`, {
    headers: { Authorization: `Bearer ${mgtToken}` }
  });
  const actionsJson = await actionsRes.json();
  const allActions = actionsJson.data.actions;

  // Find or create a planned/pending action for insufficient data test
  let pendingAction = allActions.find(a => a.status === 'planned' || a.status === 'pending');
  if (!pendingAction) {
    const createPendingRes = await fetch(`${BASE_URL}/actions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mgtToken}`
      },
      body: JSON.stringify({
        title: 'Pending Lab Upgrade for Testing',
        department: 'Information Technology',
        status: 'planned'
      })
    });
    const createPendingJson = await createPendingRes.json();
    pendingAction = createPendingJson.data;
  }

  console.log('--- A. Before / After Metric Calculations ---');

  // Test 20: Pre-action baseline metrics calculated from live MySQL
  const beforeRes = await fetch(`${BASE_URL}/impact/${pendingAction.id}/before`, {
    headers: { Authorization: `Bearer ${mgtToken}` }
  });
  const beforeJson = await beforeRes.json();
  assert(
    beforeRes.status === 200 &&
    beforeJson.success === true &&
    beforeJson.data.metrics &&
    typeof beforeJson.data.metrics.feedbackCount === 'number' &&
    typeof beforeJson.data.metrics.negativePercent === 'number' &&
    typeof beforeJson.data.metrics.averageRating === 'number',
    '20. Pre-action baseline metrics calculated from live MySQL database',
    JSON.stringify(beforeJson.data?.metrics)
  );

  // Test 21: Post-action window metrics calculated from live MySQL
  const afterRes = await fetch(`${BASE_URL}/impact/${pendingAction.id}/after`, {
    headers: { Authorization: `Bearer ${mgtToken}` }
  });
  const afterJson = await afterRes.json();
  assert(
    afterRes.status === 200 &&
    afterJson.success === true &&
    afterJson.data.metrics &&
    typeof afterJson.data.metrics.feedbackCount === 'number' &&
    typeof afterJson.data.dataSufficient === 'boolean',
    '21. Post-action window metrics calculated from live MySQL database',
    JSON.stringify(afterJson.data?.metrics)
  );

  console.log('\n--- B. Evaluation & Insufficient Data Handling ---');

  // Test 22 & 24: Pending action returns insufficient_data state without claiming false effectiveness
  const pendingImpactRes = await fetch(`${BASE_URL}/impact/${pendingAction.id}`, {
    headers: { Authorization: `Bearer ${mgtToken}` }
  });
  const pendingImpactJson = await pendingImpactRes.json();
  assert(
    pendingImpactRes.status === 200 &&
    pendingImpactJson.data.evaluation === 'insufficient_data' &&
    pendingImpactJson.data.dataSufficient === false &&
    pendingImpactJson.data.confidence === 0 &&
    typeof pendingImpactJson.data.explanation === 'string',
    '22 & 24. Action not completed or lacking post-feedback returns "insufficient_data" state',
    `Evaluation: ${pendingImpactJson.data?.evaluation}, DataSufficient: ${pendingImpactJson.data?.dataSufficient}`
  );

  // Create and complete a test action with associated feedback for effectiveness evaluation test
  // Insert feedback before and after the action completion
  const completedActionRes = await fetch(`${BASE_URL}/actions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${mgtToken}`
    },
    body: JSON.stringify({
      title: 'Ventilation and Heat Extraction Overhaul',
      department: 'Information Technology',
      assignedTo: 'HVAC Facility Services',
      priority: 'high',
      status: 'planned'
    })
  });
  const completedActionJson = await completedActionRes.json();
  const testAction = completedActionJson.data;

  // Transition to completed
  await fetch(`${BASE_URL}/actions/${testAction.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${mgtToken}`
    },
    body: JSON.stringify({
      status: 'completed',
      updateText: 'Exhaust blowers and additional condensing units installed and commissioned.'
    })
  });

  // Submit test feedback post-completion so afterCount >= 2
  await fetch(`${BASE_URL}/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`
    },
    body: JSON.stringify({
      feedbackText: 'The lab temperature is significantly cooler and comfortable for long coding sessions.',
      rating: 5,
      category: 'Infrastructure',
      department: 'Information Technology'
    })
  });
  await fetch(`${BASE_URL}/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`
    },
    body: JSON.stringify({
      feedbackText: 'Air conditioning and airflow in lab 301 is functioning well now.',
      rating: 4,
      category: 'Infrastructure',
      department: 'Information Technology'
    })
  });

  // Test 23: Effectiveness evaluation runs and calculates metric differences
  const evaluatedRes = await fetch(`${BASE_URL}/impact/${testAction.id}`, {
    headers: { Authorization: `Bearer ${mgtToken}` }
  });
  const evaluatedJson = await evaluatedRes.json();
  const evalData = evaluatedJson.data;
  assert(
    evaluatedRes.status === 200 &&
    ['effective', 'partially_effective', 'not_effective', 'insufficient_data'].includes(evalData.evaluation) &&
    evalData.changes &&
    typeof evalData.changes.ratingChange === 'number' &&
    typeof evalData.changes.negativeChange === 'number' &&
    typeof evalData.effectivenessScore === 'number' &&
    typeof evalData.explanation === 'string',
    '23. Effectiveness calculation produces valid classification, delta metrics, and explanation',
    `Evaluation: ${evalData.evaluation}, RatingChange: ${evalData.changes?.ratingChange}, Score: ${evalData.effectivenessScore}`
  );

  console.log('\n--- C. Impact Security & Role Scoping ---');

  // Test 25: Management can view impact across departments
  assert(
    evaluatedRes.status === 200 && evalData.department === 'Information Technology',
    '25 & 26. Management can view impact metrics across all departments'
  );

  // Test 27: Civil HOD cannot view another department's action impact (403 Forbidden)
  const civilForbiddenRes = await fetch(`${BASE_URL}/impact/${testAction.id}`, {
    headers: { Authorization: `Bearer ${civilHodToken}` }
  });
  assert(
    civilForbiddenRes.status === 403,
    '27. Civil HOD cannot view impact metrics for IT Department action (403 Forbidden)',
    `Status: ${civilForbiddenRes.status}`
  );

  // Student cannot view impact (403 Forbidden)
  const studentImpactRes = await fetch(`${BASE_URL}/impact/${testAction.id}`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(
    studentImpactRes.status === 403,
    '28. Student role is blocked from viewing impact tracking (403 Forbidden)',
    `Status: ${studentImpactRes.status}`
  );

  console.log('\n====================================================');
  console.log(`📊 IMPACT TRACKING TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (Total: ${passed + failed})`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runImpactTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
