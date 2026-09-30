/**
 * Comprehensive Automated Test Suite for Phase 6:
 * Smart Alerts & Action Center (Alerts, Deduplication, Actions, Audit Trail, Scoping)
 */

const BASE_URL = 'http://localhost:5000/api';

async function runAlertActionTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING PHASE 6 ALERTS & ACTIONS AUTOMATED TESTS');
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

  console.log('--- A. Smart Alerts Engine & Deduplication ---');

  // Test 1: Management fetches alerts (triggers condition checking and auto-generation)
  const mgtAlertsRes = await fetch(`${BASE_URL}/alerts`, {
    headers: { Authorization: `Bearer ${mgtToken}` }
  });
  const mgtAlertsJson = await mgtAlertsRes.json();
  assert(
    mgtAlertsRes.status === 200 &&
    mgtAlertsJson.success === true &&
    Array.isArray(mgtAlertsJson.data.alerts) &&
    mgtAlertsJson.data.stats &&
    typeof mgtAlertsJson.data.stats.total === 'number',
    '1. Management retrieves all institution alerts with summary statistics',
    `Total alerts: ${mgtAlertsJson.data?.alerts?.length}`
  );

  // Test 2: Critical issue generates alert
  const hasCriticalAlert = mgtAlertsJson.data.alerts.some(a => 
    a.severity === 'critical' || a.type === 'critical_issue' || a.type === 'sentiment_spike'
  );
  assert(
    hasCriticalAlert,
    '2. Critical issue conditions generate critical alert',
    `Found critical: ${hasCriticalAlert}`
  );

  // Test 3: High priority issue generates alert
  const hasHighAlert = mgtAlertsJson.data.alerts.some(a => 
    a.severity === 'warning' || a.type === 'high_priority_issue'
  );
  assert(
    hasHighAlert,
    '3. High priority issue conditions generate high priority / warning alert',
    `Found warning/high: ${hasHighAlert}`
  );

  // Test 4: Deduplication logic prevents duplicate alerts on repeated calls
  const initialAlertCount = mgtAlertsJson.data.alerts.length;
  const repeatRes = await fetch(`${BASE_URL}/alerts`, {
    headers: { Authorization: `Bearer ${mgtToken}` }
  });
  const repeatJson = await repeatRes.json();
  const repeatAlertCount = repeatJson.data.alerts.length;
  assert(
    initialAlertCount === repeatAlertCount,
    '4. Deduplication logic prevents duplicate alert generation on consecutive checks',
    `Initial: ${initialAlertCount}, Repeat: ${repeatAlertCount}`
  );

  console.log('\n--- B. Alert Scoping & User Actions ---');

  // Test 5: HOD sees own department alerts
  const civilAlertsRes = await fetch(`${BASE_URL}/alerts`, {
    headers: { Authorization: `Bearer ${civilHodToken}` }
  });
  const civilAlertsJson = await civilAlertsRes.json();
  assert(
    civilAlertsRes.status === 200 &&
    civilAlertsJson.data.department === 'Civil Engineering' &&
    civilAlertsJson.data.alerts.every(a => a.department === 'Civil Engineering' || a.department === 'ALL'),
    '5. HOD request scopes strictly to HOD assigned department',
    `Civil alert count: ${civilAlertsJson.data?.alerts?.length}`
  );

  // Test 6: HOD cannot see another department alerts
  const cseAlertsRes = await fetch(`${BASE_URL}/alerts`, {
    headers: { Authorization: `Bearer ${cseHodToken}` }
  });
  const cseAlertsJson = await cseAlertsRes.json();
  const cseHasCivil = cseAlertsJson.data.alerts.some(a => a.department === 'Civil Engineering');
  assert(
    cseAlertsRes.status === 200 && !cseHasCivil,
    '6. HOD cannot access alerts from another department',
    `CSE alerts has Civil: ${cseHasCivil}`
  );

  // Test 7: Student blocked from administrative alerts (403)
  const studentAlertsRes = await fetch(`${BASE_URL}/alerts`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(
    studentAlertsRes.status === 403,
    '7. Student role is forbidden from administrative alerts (403 Forbidden)',
    `Status: ${studentAlertsRes.status}`
  );

  // Test 8: Alert read status works (PUT /api/alerts/:id/read)
  const testAlert = mgtAlertsJson.data.alerts[0];
  const readRes = await fetch(`${BASE_URL}/alerts/${testAlert.id}/read`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${mgtToken}` }
  });
  const readJson = await readRes.json();
  assert(
    readRes.status === 200 &&
    readJson.success === true &&
    readJson.data.isRead === true,
    '8. Alert marked as read updates status and isRead flag',
    `Status: ${readJson.data?.status}, isRead: ${readJson.data?.isRead}`
  );

  // Test 9: Alert acknowledge works (POST /api/alerts/:id/acknowledge)
  const ackRes = await fetch(`${BASE_URL}/alerts/${testAlert.id}/acknowledge`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${mgtToken}` }
  });
  const ackJson = await ackRes.json();
  assert(
    ackRes.status === 200 &&
    ackJson.data.status === 'acknowledged' &&
    ackJson.data.acknowledgedAt !== null,
    '9. Alert acknowledge transitions status to acknowledged with timestamp',
    `Status: ${ackJson.data?.status}`
  );

  // Test 10: Mark all alerts read (PUT /api/alerts/read-all)
  const readAllRes = await fetch(`${BASE_URL}/alerts/read-all`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${mgtToken}` }
  });
  assert(
    readAllRes.status === 200,
    '10. Mark all read updates all alerts within authorized scope'
  );

  console.log('\n--- C. Action Center CRUD & Role Authorization ---');

  // Test 11: HOD creates action in own department
  const createActRes = await fetch(`${BASE_URL}/actions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${civilHodToken}`
    },
    body: JSON.stringify({
      title: 'Structural Calibration of Surveying Stations',
      description: 'Send survey prisms and electronic total stations for ISO certification calibration.',
      assignedTo: 'Dr. Suresh Menon',
      priority: 'high',
      dueDate: '2026-10-15',
      estimatedCost: 15000,
      updateText: 'Procurement ticket initiated with certified metrology vendor.'
    })
  });
  const createActJson = await createActRes.json();
  const createdCivilAction = createActJson.data;
  assert(
    createActRes.status === 201 &&
    createdCivilAction.department === 'Civil Engineering' &&
    createdCivilAction.status === 'planned' &&
    createdCivilAction.updates.length >= 1,
    '11. HOD creates action in own department with automatic audit trail entry',
    JSON.stringify(createdCivilAction)
  );

  // Test 12: HOD cannot create action in another department (403 Forbidden)
  const hodCrossRes = await fetch(`${BASE_URL}/actions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${civilHodToken}`
    },
    body: JSON.stringify({
      title: 'Install AI GPU Drivers',
      department: 'Artificial Intelligence & Data Science'
    })
  });
  assert(
    hodCrossRes.status === 403,
    '12. HOD attempting to create action for another department receives 403 Forbidden',
    `Status: ${hodCrossRes.status}`
  );

  // Test 13: Management creates action
  const mgtCreateRes = await fetch(`${BASE_URL}/actions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${mgtToken}`
    },
    body: JSON.stringify({
      title: 'Campus-wide WiFi Router Upgrade',
      department: 'Information Technology',
      assignedTo: 'Estate Infrastructure Cell',
      priority: 'critical',
      estimatedCost: 85000,
      dueDate: '2026-09-30'
    })
  });
  const mgtCreateJson = await mgtCreateRes.json();
  const createdMgtAction = mgtCreateJson.data;
  assert(
    mgtCreateRes.status === 201 &&
    createdMgtAction.department === 'Information Technology',
    '13. Management can create actions across departments',
    `Action ID: ${createdMgtAction?.id}`
  );

  // Test 14: Student cannot create action (403 Forbidden)
  const studentCreateRes = await fetch(`${BASE_URL}/actions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`
    },
    body: JSON.stringify({
      title: 'Student Attempted Action'
    })
  });
  assert(
    studentCreateRes.status === 403,
    '14. Student role is blocked from creating actions (403 Forbidden)',
    `Status: ${studentCreateRes.status}`
  );

  // Test 15: HOD retrieves own department actions
  const civilListRes = await fetch(`${BASE_URL}/actions`, {
    headers: { Authorization: `Bearer ${civilHodToken}` }
  });
  const civilListJson = await civilListRes.json();
  assert(
    civilListRes.status === 200 &&
    civilListJson.data.department === 'Civil Engineering' &&
    civilListJson.data.actions.every(a => a.department === 'Civil Engineering'),
    '15. HOD retrieves actions strictly scoped to their own department',
    `Count: ${civilListJson.data?.actions?.length}`
  );

  // Test 16: Management retrieves all actions
  const mgtListRes = await fetch(`${BASE_URL}/actions`, {
    headers: { Authorization: `Bearer ${mgtToken}` }
  });
  const mgtListJson = await mgtListRes.json();
  assert(
    mgtListRes.status === 200 &&
    mgtListJson.data.actions.length >= 2,
    '16. Management retrieves all actions across the institution',
    `Total actions: ${mgtListJson.data?.actions?.length}`
  );

  console.log('\n--- D. Action Status Updates, Audit Trail & Validation ---');

  // Test 17: Action status update works (transitions to in_progress then completed)
  const updateRes = await fetch(`${BASE_URL}/actions/${createdCivilAction.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${civilHodToken}`
    },
    body: JSON.stringify({
      status: 'in_progress',
      updateText: 'Calibration vendor arrived on site.'
    })
  });
  const updateJson = await updateRes.json();
  assert(
    updateRes.status === 200 &&
    updateJson.data.status === 'in_progress',
    '17. Action status transition updates status and returns updated record',
    `Status: ${updateJson.data?.status}`
  );

  // Test 18: Action update audit trail records in action_updates
  const addUpdateRes = await fetch(`${BASE_URL}/actions/${createdCivilAction.id}/updates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${civilHodToken}`
    },
    body: JSON.stringify({
      updateText: 'Metrology inspection completed; certification sticker applied.',
      newStatus: 'completed'
    })
  });
  const addUpdateJson = await addUpdateRes.json();

  // Verify single action detail includes the full audit trail
  const singleActionRes = await fetch(`${BASE_URL}/actions/${createdCivilAction.id}`, {
    headers: { Authorization: `Bearer ${civilHodToken}` }
  });
  const singleActionJson = await singleActionRes.json();
  assert(
    addUpdateRes.status === 201 &&
    singleActionJson.data.status === 'completed' &&
    Array.isArray(singleActionJson.data.updates) &&
    singleActionJson.data.updates.length >= 3,
    '18. Action audit trail accumulates chronological progress updates in action_updates',
    `Audit updates count: ${singleActionJson.data?.updates?.length}`
  );

  // Test 19: Invalid action input rejected with 400 Bad Request
  const invalidActionRes = await fetch(`${BASE_URL}/actions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${mgtToken}`
    },
    body: JSON.stringify({
      title: '', // invalid title
      priority: 'super-urgent' // invalid priority
    })
  });
  assert(
    invalidActionRes.status === 400,
    '19. Invalid action inputs are rejected with 400 Bad Request',
    `Status: ${invalidActionRes.status}`
  );

  console.log('\n====================================================');
  console.log(`📊 ALERTS & ACTIONS TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (Total: ${passed + failed})`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAlertActionTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
