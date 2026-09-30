/**
 * Comprehensive Automated Test Suite for Phase 2:
 * Authentication & Authorization (Roles, Departments, Profile, JWT)
 */

const BASE_URL = 'http://localhost:5000/api/auth';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING PHASE 2 AUTHENTICATION & AUTHORIZATION TESTS');
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

  // 1. Test Registration
  console.log('--- 1. Testing Registration ---');
  const timestamp = Date.now();
  const testStudentEmail = `test.student.${timestamp}@college.edu`;

  // 1a. Successful Student Registration
  const regRes = await fetch(`${BASE_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test Student',
      email: testStudentEmail,
      password: 'password123',
      role: 'student',
      department: 'Civil Engineering'
    })
  });
  const regData = await regRes.json();
  assert(
    regRes.status === 201 && regData.success && regData.data?.token && regData.data?.user?.department === 'Civil Engineering',
    'Register new student with valid official department',
    JSON.stringify(regData)
  );

  // 1b. Duplicate Email Registration
  const dupRes = await fetch(`${BASE_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Duplicate Student',
      email: testStudentEmail,
      password: 'password123',
      role: 'student',
      department: 'Civil Engineering'
    })
  });
  const dupData = await dupRes.json();
  assert(
    dupRes.status === 409 && !dupData.success,
    'Reject registration with duplicate email (409 Conflict)',
    JSON.stringify(dupData)
  );

  // 1c. Invalid Department Registration
  const badDeptRes = await fetch(`${BASE_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Bad Dept Student',
      email: `baddept.${timestamp}@college.edu`,
      password: 'password123',
      role: 'student',
      department: 'NonExistent Department'
    })
  });
  const badDeptData = await badDeptRes.json();
  assert(
    badDeptRes.status === 400 && !badDeptData.success,
    'Reject registration with non-official department (400 Bad Request)',
    JSON.stringify(badDeptData)
  );

  // 1d. Weak Password Registration
  const weakPassRes = await fetch(`${BASE_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Weak Pass',
      email: `weak.${timestamp}@college.edu`,
      password: '123',
      role: 'student',
      department: 'Civil Engineering'
    })
  });
  assert(
    weakPassRes.status === 400,
    'Reject registration with short password < 6 chars (400 Bad Request)'
  );

  // 2. Test Login
  console.log('\n--- 2. Testing Login & Authentication ---');

  // 2a. Login with Invalid Password
  const badLoginRes = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'hod.civil@college.edu',
      password: 'WRONG_PASSWORD_XYZ'
    })
  });
  const badLoginData = await badLoginRes.json();
  assert(
    badLoginRes.status === 401 && !badLoginData.success,
    'Reject login with incorrect password (401 Unauthorized)',
    JSON.stringify(badLoginData)
  );

  // 2b. Login Demo Accounts
  async function loginUser(email, password, role) {
    const res = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role })
    });
    const data = await res.json();
    return { status: res.status, data };
  }

  const civilStudentLogin = await loginUser('student.civil@college.edu', 'password123', 'student');
  assert(
    civilStudentLogin.status === 200 && civilStudentLogin.data.data?.token,
    'Login Demo Student (Civil Engineering)',
    civilStudentLogin.data.message
  );
  const studentToken = civilStudentLogin.data.data?.token;
  const studentId = civilStudentLogin.data.data?.user?.id;

  const civilHodLogin = await loginUser('hod.civil@college.edu', 'password123', 'hod');
  assert(
    civilHodLogin.status === 200 && civilHodLogin.data.data?.token && civilHodLogin.data.data?.user?.department === 'Civil Engineering',
    'Login Demo HOD (Civil Engineering)',
    civilHodLogin.data.message
  );
  const civilHodToken = civilHodLogin.data.data?.token;

  const cseHodLogin = await loginUser('hod.cse@college.edu', 'password123', 'hod');
  assert(
    cseHodLogin.status === 200 && cseHodLogin.data.data?.token && cseHodLogin.data.data?.user?.department === 'Computer Science & Engineering',
    'Login Demo HOD (Computer Science & Engineering)',
    cseHodLogin.data.message
  );
  const cseHodToken = cseHodLogin.data.data?.token;

  const mgtLogin = await loginUser('management@college.edu', 'password123', 'management');
  assert(
    mgtLogin.status === 200 && mgtLogin.data.data?.token && mgtLogin.data.data?.user?.role === 'management',
    'Login Demo Management User',
    mgtLogin.data.message
  );
  const mgtToken = mgtLogin.data.data?.token;

  // 2c. Role mismatch login test
  const roleMismatch = await loginUser('hod.civil@college.edu', 'password123', 'student');
  assert(
    roleMismatch.status === 403,
    'Reject login if portal role does not match user registered role (403 Forbidden)'
  );

  // 3. Test Profile Endpoints
  console.log('\n--- 3. Testing /api/auth/me and Profile Update ---');

  // 3a. GET /api/auth/me with valid token
  const meRes = await fetch(`${BASE_URL}/me`, {
    headers: { Authorization: `Bearer ${civilHodToken}` }
  });
  const meData = await meRes.json();
  assert(
    meRes.status === 200 && (meData.data?.user?.email === 'hod.civil@college.edu' || meData.data?.user?.email === 'hod.civil@test.feedbackiq.local'),
    'GET /api/auth/me returns authenticated user details',
    JSON.stringify(meData)
  );

  // 3b. GET /api/auth/me with missing token
  const noTokenRes = await fetch(`${BASE_URL}/me`);
  assert(noTokenRes.status === 401, 'GET /api/auth/me rejects missing token (401)');

  // 3c. GET /api/auth/me with invalid token
  const badTokenRes = await fetch(`${BASE_URL}/me`, {
    headers: { Authorization: 'Bearer INVALID_JWT_STRING_XYZ' }
  });
  assert(badTokenRes.status === 401, 'GET /api/auth/me rejects invalid token (401)');

  // 3d. PUT /api/auth/profile update name
  const updateNameRes = await fetch(`${BASE_URL}/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${regData.data.token}`
    },
    body: JSON.stringify({ name: 'Updated Student Name' })
  });
  const updateNameData = await updateNameRes.json();
  assert(
    updateNameRes.status === 200 && updateNameData.data?.user?.name === 'Updated Student Name',
    'PUT /api/auth/profile successfully updates name',
    JSON.stringify(updateNameData)
  );

  // 3e. PUT /api/auth/profile prevent role change privilege escalation
  const escalateRes = await fetch(`${BASE_URL}/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${regData.data.token}`
    },
    body: JSON.stringify({ role: 'management' })
  });
  assert(
    escalateRes.status === 403,
    'PUT /api/auth/profile strictly prevents role escalation (403 Forbidden)'
  );

  // 3f. PUT /api/auth/profile prevent department change
  const deptChangeRes = await fetch(`${BASE_URL}/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${regData.data.token}`
    },
    body: JSON.stringify({ department: 'Computer Science & Engineering' })
  });
  assert(
    deptChangeRes.status === 403,
    'PUT /api/auth/profile strictly prevents department tampering (403 Forbidden)'
  );

  // 4. Critical Authorization Tests
  console.log('\n--- 4. Testing Critical Role & Department Isolation ---');

  // Test 4.1: Civil HOD attempts to access CSE data -> MUST return 403
  const test4_1 = await fetch(`${BASE_URL}/test/department/Computer Science & Engineering`, {
    headers: { Authorization: `Bearer ${civilHodToken}` }
  });
  const test4_1_data = await test4_1.json();
  assert(
    test4_1.status === 403 && !test4_1_data.success,
    'CRITICAL TEST 1: Civil HOD attempts to access CSE data -> MUST return 403 Forbidden',
    `Status: ${test4_1.status}, Message: ${test4_1_data.message}`
  );

  // Test 4.2: CSE HOD attempts to access Civil data -> MUST return 403
  const test4_2 = await fetch(`${BASE_URL}/test/department/Civil Engineering`, {
    headers: { Authorization: `Bearer ${cseHodToken}` }
  });
  const test4_2_data = await test4_2.json();
  assert(
    test4_2.status === 403 && !test4_2_data.success,
    'CRITICAL TEST 2: CSE HOD attempts to access Civil data -> MUST return 403 Forbidden',
    `Status: ${test4_2.status}, Message: ${test4_2_data.message}`
  );

  // Test 4.2b: Civil HOD accesses Civil data -> MUST succeed (200)
  const testCivilOwn = await fetch(`${BASE_URL}/test/department/Civil Engineering`, {
    headers: { Authorization: `Bearer ${civilHodToken}` }
  });
  assert(
    testCivilOwn.status === 200,
    'Civil HOD accesses their own Civil Engineering data -> MUST succeed (200 OK)'
  );

  // Test 4.2c: CSE HOD accesses CSE data -> MUST succeed (200)
  const testCseOwn = await fetch(`${BASE_URL}/test/department/Computer Science & Engineering`, {
    headers: { Authorization: `Bearer ${cseHodToken}` }
  });
  assert(
    testCseOwn.status === 200,
    'CSE HOD accesses their own CSE data -> MUST succeed (200 OK)'
  );

  // Test 4.3: Student attempts to access another student's protected data -> MUST return 403
  const anotherStudentId = studentId === 1 ? 2 : 1;
  const test4_3 = await fetch(`${BASE_URL}/test/student-record/${anotherStudentId}`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  const test4_3_data = await test4_3.json();
  assert(
    test4_3.status === 403 && !test4_3_data.success,
    `CRITICAL TEST 3: Student #${studentId} attempts to access Student #${anotherStudentId} record -> MUST return 403 Forbidden`,
    `Status: ${test4_3.status}, Message: ${test4_3_data.message}`
  );

  // Test 4.3b: Student accesses their own protected record -> MUST succeed (200)
  const testStudentOwn = await fetch(`${BASE_URL}/test/student-record/${studentId}`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(
    testStudentOwn.status === 200,
    `Student accesses their own record #${studentId} -> MUST succeed (200 OK)`
  );

  // Test 4.4: Management accesses Civil data -> MUST succeed (200)
  const test4_4 = await fetch(`${BASE_URL}/test/department/Civil Engineering`, {
    headers: { Authorization: `Bearer ${mgtToken}` }
  });
  const test4_4_data = await test4_4.json();
  assert(
    test4_4.status === 200 && test4_4_data.success,
    'CRITICAL TEST 4: Management accesses Civil data -> MUST succeed (200 OK)',
    JSON.stringify(test4_4_data)
  );

  // Test 4.5: Management accesses CSE data -> MUST succeed (200)
  const test4_5 = await fetch(`${BASE_URL}/test/department/Computer Science & Engineering`, {
    headers: { Authorization: `Bearer ${mgtToken}` }
  });
  const test4_5_data = await test4_5.json();
  assert(
    test4_5.status === 200 && test4_5_data.success,
    'CRITICAL TEST 5: Management accesses CSE data -> MUST succeed (200 OK)',
    JSON.stringify(test4_5_data)
  );

  // Test 4.6: Student attempts to access departmental administrative data -> MUST return 403
  const testStudentDeptAdmin = await fetch(`${BASE_URL}/test/department/Civil Engineering`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  assert(
    testStudentDeptAdmin.status === 403,
    'Student attempts to access department administrative data -> MUST return 403 Forbidden'
  );

  console.log('\n====================================================');
  console.log(`📊 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (Total: ${passed + failed})`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
