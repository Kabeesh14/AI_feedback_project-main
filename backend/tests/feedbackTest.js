/**
 * Comprehensive Automated Test Suite for Phase 3:
 * Feedback Submission, Retrieval, Department Filtering, Pagination, & Anonymous Handling
 */

const BASE_URL = 'http://localhost:5000/api';

async function runFeedbackTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING PHASE 3 FEEDBACK API AUTOMATED TESTS');
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
    return json.data.token;
  }

  // Log in demo accounts
  const studentCivilToken = await login('student.civil@college.edu', 'password123', 'student');
  const studentItToken = await login('student.it@college.edu', 'password123', 'student');
  const civilHodToken = await login('hod.civil@college.edu', 'password123', 'hod');
  const cseHodToken = await login('hod.cse@college.edu', 'password123', 'hod');
  const mgtToken = await login('management@college.edu', 'password123', 'management');

  // Test 1: Student submits valid feedback
  console.log('--- 1. Testing Feedback Submission ---');
  const subRes = await fetch(`${BASE_URL}/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentCivilToken}`
    },
    body: JSON.stringify({
      feedbackText: 'The surveying equipment in Survey Lab requires calibration and modern total stations.',
      rating: 4,
      category: 'Laboratory',
      anonymous: false,
      semester: 'Semester 5',
      academicYear: '2025-2026'
    })
  });
  const subData = await subRes.json();
  assert(
    subRes.status === 201 && subData.success && subData.data?.department === 'Civil Engineering',
    'Test 1: Student submits feedback successfully',
    JSON.stringify(subData)
  );
  const civilFeedbackId = subData.data?.id;

  // Submit an anonymous feedback for testing identity protection
  const anonSubRes = await fetch(`${BASE_URL}/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentCivilToken}`
    },
    body: JSON.stringify({
      feedbackText: 'Classroom ventilation in Civil Block 2 is noisy during afternoon lectures.',
      rating: 2,
      category: 'Infrastructure',
      anonymous: true,
      semester: 'Semester 5',
      academicYear: '2025-2026'
    })
  });
  const anonSubData = await anonSubRes.json();
  const anonFeedbackId = anonSubData.data?.id;

  // Submit a feedback from student IT
  const itSubRes = await fetch(`${BASE_URL}/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentItToken}`
    },
    body: JSON.stringify({
      feedbackText: 'Internet bandwidth in IT Lab 3 has high latency during cloud deployment practicals.',
      rating: 3,
      category: 'Internet',
      anonymous: false,
      semester: 'Semester 6',
      academicYear: '2025-2026'
    })
  });
  const itSubData = await itSubRes.json();
  const itFeedbackId = itSubData.data?.id;

  // Test 2: Student retrieves own feedback
  console.log('\n--- 2. Testing Student Self-Access ---');
  const myRes = await fetch(`${BASE_URL}/feedback/my`, {
    headers: { Authorization: `Bearer ${studentCivilToken}` }
  });
  const myData = await myRes.json();
  const hasOwn = myData.data?.some(f => f.id === civilFeedbackId);
  assert(
    myRes.status === 200 && myData.success && hasOwn,
    'Test 2: Student retrieves own feedback via /api/feedback/my',
    `Count: ${myData.data?.length}`
  );

  // Test 3: Student cannot retrieve another student's feedback
  const otherRes = await fetch(`${BASE_URL}/feedback/${itFeedbackId}`, {
    headers: { Authorization: `Bearer ${studentCivilToken}` }
  });
  const otherData = await otherRes.json();
  assert(
    otherRes.status === 403 && !otherData.success,
    "Test 3: Student cannot retrieve another student's feedback by ID (403 Forbidden)",
    `Status: ${otherRes.status}, Message: ${otherData.message}`
  );

  // Test 4: Student cannot assign feedback to another department
  const badDeptSub = await fetch(`${BASE_URL}/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentCivilToken}`
    },
    body: JSON.stringify({
      feedbackText: 'Attempting to file feedback for another department illegally.',
      rating: 3,
      category: 'Teaching',
      department: 'Computer Science & Engineering'
    })
  });
  const badDeptSubData = await badDeptSub.json();
  assert(
    badDeptSub.status === 400 && !badDeptSubData.success,
    'Test 4: Student cannot assign feedback to another department (400 Bad Request)',
    `Status: ${badDeptSub.status}, Message: ${badDeptSubData.message}`
  );

  // Test 5 & 6: Civil HOD isolation
  console.log('\n--- 3. Testing HOD Department Isolation ---');
  const civilHodListRes = await fetch(`${BASE_URL}/feedback`, {
    headers: { Authorization: `Bearer ${civilHodToken}` }
  });
  const civilHodListData = await civilHodListRes.json();
  const onlyCivil = civilHodListData.data?.every(f => f.department === 'Civil Engineering');
  assert(
    civilHodListRes.status === 200 && onlyCivil && civilHodListData.data?.length > 0,
    'Test 5: Civil HOD retrieves Civil feedback',
    `Found ${civilHodListData.data?.length} Civil records`
  );

  const civilHodTryCse = await fetch(`${BASE_URL}/feedback/department/Computer Science & Engineering`, {
    headers: { Authorization: `Bearer ${civilHodToken}` }
  });
  const civilHodTryCseData = await civilHodTryCse.json();
  assert(
    civilHodTryCse.status === 403 && !civilHodTryCseData.success,
    'Test 6: Civil HOD cannot retrieve CSE feedback via department route (403 Forbidden)',
    `Status: ${civilHodTryCse.status}, Message: ${civilHodTryCseData.message}`
  );

  // Test 6b: Civil HOD query override attempt
  const civilHodQueryOverride = await fetch(`${BASE_URL}/feedback?department=Computer Science & Engineering`, {
    headers: { Authorization: `Bearer ${civilHodToken}` }
  });
  assert(
    civilHodQueryOverride.status === 403,
    'Civil HOD cannot override department via query parameter (403 Forbidden)'
  );

  // Test 7 & 8: CSE HOD isolation
  const cseHodListRes = await fetch(`${BASE_URL}/feedback`, {
    headers: { Authorization: `Bearer ${cseHodToken}` }
  });
  const cseHodListData = await cseHodListRes.json();
  const onlyCse = cseHodListData.data?.every(f => f.department === 'Computer Science & Engineering');
  assert(
    cseHodListRes.status === 200 && onlyCse,
    'Test 7: CSE HOD retrieves CSE feedback',
    `Found ${cseHodListData.data?.length} CSE records`
  );

  const cseHodTryCivil = await fetch(`${BASE_URL}/feedback/department/Civil Engineering`, {
    headers: { Authorization: `Bearer ${cseHodToken}` }
  });
  const cseHodTryCivilData = await cseHodTryCivil.json();
  assert(
    cseHodTryCivil.status === 403 && !cseHodTryCivilData.success,
    'Test 8: CSE HOD cannot retrieve Civil feedback (403 Forbidden)',
    `Status: ${cseHodTryCivil.status}, Message: ${cseHodTryCivilData.message}`
  );

  // Test 9 & 10: Management global access and filtering
  console.log('\n--- 4. Testing Management Capabilities ---');
  const mgtAllRes = await fetch(`${BASE_URL}/feedback`, {
    headers: { Authorization: `Bearer ${mgtToken}` }
  });
  const mgtAllData = await mgtAllRes.json();
  assert(
    mgtAllRes.status === 200 && mgtAllData.data?.length > 1,
    'Test 9: Management retrieves all feedback across institution',
    `Total: ${mgtAllData.pagination?.total}`
  );

  const mgtFilterCivilRes = await fetch(`${BASE_URL}/feedback?department=Civil Engineering`, {
    headers: { Authorization: `Bearer ${mgtToken}` }
  });
  const mgtFilterCivilData = await mgtFilterCivilRes.json();
  const allCivilInFilter = mgtFilterCivilData.data?.every(f => f.department === 'Civil Engineering');
  assert(
    mgtFilterCivilRes.status === 200 && allCivilInFilter && mgtFilterCivilData.data?.length > 0,
    'Test 10: Management filters by specific department (Civil Engineering)',
    `Found ${mgtFilterCivilData.data?.length} Civil records`
  );

  // Test 11: Invalid category rejected
  console.log('\n--- 5. Testing Input Validation ---');
  const badCatRes = await fetch(`${BASE_URL}/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentCivilToken}`
    },
    body: JSON.stringify({
      feedbackText: 'Valid feedback text goes here.',
      rating: 3,
      category: 'FakeCategory123'
    })
  });
  assert(
    badCatRes.status === 400,
    'Test 11: Invalid category rejected (400 Bad Request)'
  );

  // Test 12: Invalid rating rejected
  const badRateRes = await fetch(`${BASE_URL}/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentCivilToken}`
    },
    body: JSON.stringify({
      feedbackText: 'Valid feedback text goes here.',
      rating: 6, // Exceeds 1-5
      category: 'Teaching'
    })
  });
  assert(
    badRateRes.status === 400,
    'Test 12: Invalid rating rejected (rating = 6 -> 400 Bad Request)'
  );

  // Test 13: Empty / short feedback rejected
  const emptyRes = await fetch(`${BASE_URL}/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentCivilToken}`
    },
    body: JSON.stringify({
      feedbackText: '   ',
      rating: 3,
      category: 'Teaching'
    })
  });
  assert(
    emptyRes.status === 400,
    'Test 13: Empty feedback rejected (400 Bad Request)'
  );

  // Test 14: Pagination works
  console.log('\n--- 6. Testing Pagination, Filtering & Anonymous Protection ---');
  const pageRes = await fetch(`${BASE_URL}/feedback?page=1&limit=2`, {
    headers: { Authorization: `Bearer ${mgtToken}` }
  });
  const pageData = await pageRes.json();
  assert(
    pageRes.status === 200 && pageData.pagination && pageData.pagination.limit === 2 && pageData.data.length <= 2,
    'Test 14: Pagination works (?page=1&limit=2)',
    `Returned ${pageData.data?.length} items with totalPages: ${pageData.pagination?.totalPages}`
  );

  // Test 15: Date filtering works
  const today = new Date().toISOString().split('T')[0];
  const dateRes = await fetch(`${BASE_URL}/feedback?fromDate=${today}`, {
    headers: { Authorization: `Bearer ${mgtToken}` }
  });
  const dateData = await dateRes.json();
  assert(
    dateRes.status === 200 && Array.isArray(dateData.data),
    'Test 15: Date filtering works (?fromDate=...)',
    `Found ${dateData.data?.length} records created today`
  );

  // Test 16: Status filtering works
  const statusRes = await fetch(`${BASE_URL}/feedback?status=submitted`, {
    headers: { Authorization: `Bearer ${mgtToken}` }
  });
  const statusData = await statusRes.json();
  const allSubmitted = statusData.data?.every(f => f.status === 'submitted');
  assert(
    statusRes.status === 200 && allSubmitted,
    'Test 16: Status filtering works (?status=submitted)',
    `Found ${statusData.data?.length} submitted records`
  );

  // Test 17: Anonymous identity is protected in admin responses
  const anonAdminRes = await fetch(`${BASE_URL}/feedback/${anonFeedbackId}`, {
    headers: { Authorization: `Bearer ${civilHodToken}` }
  });
  const anonAdminData = await anonAdminRes.json();
  assert(
    anonAdminRes.status === 200 &&
    anonAdminData.data?.studentName === 'Anonymous Student' &&
    anonAdminData.data?.studentId === 'ANONYMOUS' &&
    anonAdminData.data?.userId === null,
    'Test 17: Anonymous identity is protected in admin / HOD views',
    `studentName: ${anonAdminData.data?.studentName}, studentId: ${anonAdminData.data?.studentId}`
  );

  // Test 17b: Authoring student can see their own anonymous feedback
  const anonStudentRes = await fetch(`${BASE_URL}/feedback/${anonFeedbackId}`, {
    headers: { Authorization: `Bearer ${studentCivilToken}` }
  });
  const anonStudentData = await anonStudentRes.json();
  assert(
    anonStudentRes.status === 200 &&
    anonStudentData.data?.anonymous === true &&
    anonStudentData.data?.studentName !== 'Anonymous Student',
    'Authoring student can see their own identity on anonymous feedback',
    `studentName: ${anonStudentData.data?.studentName}`
  );

  // Test 18: HOD status update
  const updateRes = await fetch(`${BASE_URL}/feedback/${civilFeedbackId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${civilHodToken}`
    },
    body: JSON.stringify({
      status: 'under_review',
      statusNotes: 'Inspection scheduled with Survey Lab in-charge.'
    })
  });
  const updateData = await updateRes.json();
  assert(
    updateRes.status === 200 && updateData.data?.status === 'under_review',
    'HOD can update feedback status to under_review with notes',
    `New status: ${updateData.data?.status}`
  );

  // Test 19: Student cannot update status (403 Forbidden)
  const studentUpdateRes = await fetch(`${BASE_URL}/feedback/${civilFeedbackId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentCivilToken}`
    },
    body: JSON.stringify({ status: 'resolved' })
  });
  assert(
    studentUpdateRes.status === 403,
    'Student cannot update feedback status (403 Forbidden)'
  );

  // Test 20: 404 on nonexistent feedback
  const notFoundRes = await fetch(`${BASE_URL}/feedback/999999`, {
    headers: { Authorization: `Bearer ${mgtToken}` }
  });
  assert(
    notFoundRes.status === 404,
    'Nonexistent feedback returns 404 Not Found'
  );

  // Test 21: Unauthenticated request returns 401
  const unauthRes = await fetch(`${BASE_URL}/feedback`);
  assert(
    unauthRes.status === 401,
    'Unauthenticated request returns 401 Unauthorized'
  );

  console.log('\n====================================================');
  console.log(`📊 PHASE 3 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (Total: ${passed + failed})`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runFeedbackTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
