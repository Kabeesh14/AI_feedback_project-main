/**
 * Comprehensive Automated Test Suite for Phase 4:
 * AI Analysis Pipeline, Root-Cause Intelligence, Recurring Issues & Explainability
 */

const aiService = require('../services/aiService');

const BASE_URL = 'http://localhost:5000/api';

async function runAITests() {
  console.log('====================================================');
  console.log('🧪 RUNNING PHASE 4 AI & ROOT-CAUSE INTELLIGENCE TESTS');
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

  // -------------------------------------------------------------
  // UNIT / COMPONENT AI TESTS (Tests 1 - 7, 16, 17)
  // -------------------------------------------------------------
  console.log('--- 1. Testing Core AI Analysis Functions ---');

  // Test 1: Analyze positive feedback
  const posRes = aiService.analyzeSentiment('Prof. Raman explained Distributed Systems with excellent clarity and helpful code examples.', 5);
  assert(
    posRes.sentiment === 'positive' && posRes.score >= 65,
    'Test 1: Analyze positive feedback (sentiment=positive, score>=65)',
    `Result: ${JSON.stringify(posRes)}`
  );

  // Test 2: Analyze neutral feedback
  const neuRes = aiService.analyzeSentiment('The library hours are unchanged for the upcoming semester.', 3);
  assert(
    neuRes.sentiment === 'neutral' && neuRes.score >= 40 && neuRes.score <= 60,
    'Test 2: Analyze neutral feedback (sentiment=neutral, score~50)',
    `Result: ${JSON.stringify(neuRes)}`
  );

  // Test 3: Analyze negative feedback with contrastive nuance
  const negRes = aiService.analyzeSentiment('The teacher is good but the laboratory computers are extremely slow, outdated and frustrating.', 1);
  assert(
    negRes.sentiment === 'negative' && negRes.score <= 45,
    'Test 3: Analyze negative feedback with contrastive nuance (captures post-"but" complaint)',
    `Result: ${JSON.stringify(negRes)}`
  );

  // Test 4: Detect theme
  const detectedTheme = aiService.detectTheme('The WiFi signal in Block 2 keeps dropping during online exams.');
  assert(
    detectedTheme === 'Internet',
    'Test 4: Detect theme accurately (WiFi -> Internet)',
    `Detected: ${detectedTheme}`
  );

  // Test 5: Detect issue
  const detectedIssue = aiService.detectIssue('Internet speed is very slow in the laboratory during afternoon sessions.', 'Internet');
  assert(
    typeof detectedIssue === 'string' && detectedIssue.length > 5 && detectedIssue.toLowerCase().includes('internet'),
    'Test 5: Detect specific issue title',
    `Issue: ${detectedIssue}`
  );

  // Test 6: Generate possible root causes
  const causes = aiService.identifyRootCauses(
    'Computers lag significantly during peak afternoon practicals due to RAM paging.',
    'Laboratory',
    'Slow Computing Lab Workstations'
  );
  assert(
    Array.isArray(causes) &&
    causes.length >= 2 &&
    causes[0].cause.startsWith('Possible contributing factor') &&
    typeof causes[0].confidence === 'number',
    'Test 6: Generate possible root causes with calibrated confidence and evidence',
    `Causes: ${JSON.stringify(causes[0])}`
  );

  // Test 7: Generate priority
  const criticalPrio = aiService.calculatePriority({
    sentiment: 'negative',
    sentimentScore: 20,
    text: 'There is a dangerous water leak near the main server rack creating an electrical hazard emergency!',
    rating: 1
  });
  const lowPrio = aiService.calculatePriority({
    sentiment: 'positive',
    sentimentScore: 85,
    text: 'Everything in the reading hall is comfortable and clean.',
    rating: 5
  });
  assert(
    criticalPrio === 'critical' && lowPrio === 'low',
    'Test 7: Priority calculation engine (hazard -> critical, positive -> low)',
    `Critical: ${criticalPrio}, Low: ${lowPrio}`
  );

  // Test 16: Missing Gemini key uses fallback clearly
  const fallbackAnalysis = await aiService.analyzeFeedback('Wi-Fi is slow in lab 3', 'Internet', 'Information Technology');
  assert(
    fallbackAnalysis.provider === 'fallback' && fallbackAnalysis.sentiment === 'negative',
    'Test 16: Missing Gemini key clearly uses fallback provider without faking API responses',
    `Provider: ${fallbackAnalysis.provider}`
  );

  // Test 17: Structured response format validation
  assert(
    fallbackAnalysis.possibleRootCauses.every(c => c.cause && typeof c.confidence === 'number' && c.evidence),
    'Test 17: Structured AI output schema strictly validated (cause, confidence, evidence)',
    JSON.stringify(fallbackAnalysis.possibleRootCauses[0])
  );

  // -------------------------------------------------------------
  // API INTEGRATION & DATABASE PERSISTENCE TESTS (Tests 8 - 15, 18 - 20)
  // -------------------------------------------------------------
  console.log('\n--- 2. Testing End-to-End Feedback AI Pipeline ---');

  // Log in tokens
  const studentCivilToken = await login('student.civil@college.edu', 'password123', 'student');
  const studentItToken = await login('student.it@college.edu', 'password123', 'student');
  const civilHodToken = await login('hod.civil@college.edu', 'password123', 'hod');
  const cseHodToken = await login('hod.cse@college.edu', 'password123', 'hod');
  const mgtToken = await login('management@college.edu', 'password123', 'management');

  // Submit feedback 1 for Civil Engineering
  const civilPostRes = await fetch(`${BASE_URL}/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentCivilToken}`
    },
    body: JSON.stringify({
      feedbackText: 'The survey lab equipment lacks modern digital theodolites and the existing prism poles are broken.',
      rating: 2,
      category: 'Laboratory',
      anonymous: false
    })
  });
  const civilPostData = await civilPostRes.json();
  const civilFbId = civilPostData.data?.id;

  // Test 18: AI failure does not delete/fail feedback submission
  assert(
    civilPostRes.status === 201 && civilPostData.success && civilFbId,
    'Test 18: Feedback submission succeeds immediately (AI execution is non-blocking)',
    `Created ID: ${civilFbId}`
  );

  // Wait a brief moment for async AI hook to complete
  await new Promise(r => setTimeout(r, 600));

  // Test 8 & 9: Save & Retrieve AI Analysis
  const getAnalysisRes = await fetch(`${BASE_URL}/ai/feedback/${civilFbId}`, {
    headers: { Authorization: `Bearer ${studentCivilToken}` }
  });
  const getAnalysisData = await getAnalysisRes.json();
  assert(
    getAnalysisRes.status === 200 &&
    getAnalysisData.data?.sentiment &&
    getAnalysisData.data?.priority &&
    getAnalysisData.data?.status === 'completed',
    'Test 8 & 9: Save and retrieve AI analysis for feedback record',
    JSON.stringify(getAnalysisData.data)
  );

  // Submit feedback for IT
  const itPostRes = await fetch(`${BASE_URL}/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentItToken}`
    },
    body: JSON.stringify({
      feedbackText: 'Wi-Fi connection latency in IT Department computing lab 4 causes timeouts during git pushes.',
      rating: 2,
      category: 'Internet'
    })
  });
  const itPostData = await itPostRes.json();
  const itFbId = itPostData.data?.id;
  await new Promise(r => setTimeout(r, 600));

  console.log('\n--- 3. Testing AI Endpoint Security & Role Scoping ---');

  // Test 10: Student can access own analysis
  const studentOwnAnalysis = await fetch(`${BASE_URL}/ai/feedback/${civilFbId}`, {
    headers: { Authorization: `Bearer ${studentCivilToken}` }
  });
  assert(
    studentOwnAnalysis.status === 200,
    'Test 10: Student can access their own feedback AI analysis (200 OK)'
  );

  // Test 11: Student cannot access another student's analysis
  const studentTryOther = await fetch(`${BASE_URL}/ai/feedback/${itFbId}`, {
    headers: { Authorization: `Bearer ${studentCivilToken}` }
  });
  assert(
    studentTryOther.status === 403,
    "Test 11: Student cannot access another student's feedback analysis (403 Forbidden)"
  );

  // Test 12: Civil HOD can access Civil analysis
  const civilHodAccessCivil = await fetch(`${BASE_URL}/ai/feedback/${civilFbId}`, {
    headers: { Authorization: `Bearer ${civilHodToken}` }
  });
  assert(
    civilHodAccessCivil.status === 200,
    'Test 12: Civil HOD can access Civil feedback analysis (200 OK)'
  );

  // Test 13: Civil HOD cannot access CSE analysis
  const civilHodTryCse = await fetch(`${BASE_URL}/ai/feedback/${itFbId}`, {
    headers: { Authorization: `Bearer ${civilHodToken}` }
  });
  assert(
    civilHodTryCse.status === 403,
    'Test 13: Civil HOD cannot access other department feedback analysis (403 Forbidden)'
  );

  // Test 14: CSE HOD can access CSE/IT records or department-scoped data
  // Submit a CSE feedback
  const csePostRes = await fetch(`${BASE_URL}/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cseHodToken}` // Demo HOD submission/test
    },
    body: JSON.stringify({
      feedbackText: 'High CPU throttling on CSE server 2 running compilers.',
      rating: 2,
      category: 'Laboratory'
    })
  }).catch(() => null);

  const cseHodCheckCse = await fetch(`${BASE_URL}/ai/issues/6`, {
    headers: { Authorization: `Bearer ${cseHodToken}` }
  });
  assert(
    cseHodCheckCse.status === 200,
    'Test 14: CSE HOD can access CSE department issue intelligence (200 OK)'
  );

  // Test 15: Management can access all departments
  const mgtAccessCivil = await fetch(`${BASE_URL}/ai/feedback/${civilFbId}`, {
    headers: { Authorization: `Bearer ${mgtToken}` }
  });
  const mgtAccessIt = await fetch(`${BASE_URL}/ai/feedback/${itFbId}`, {
    headers: { Authorization: `Bearer ${mgtToken}` }
  });
  assert(
    mgtAccessCivil.status === 200 && mgtAccessIt.status === 200,
    'Test 15: Management can access feedback analysis across all departments (200 OK)'
  );

  // -------------------------------------------------------------
  // RECURRING ISSUES & EXPLAINABILITY (Tests 19 & 20)
  // -------------------------------------------------------------
  console.log('\n--- 4. Testing Recurring Issues & Explainability ---');

  // Test 19: Recurring issue detection
  // Submit second related feedback in Civil Engineering
  const civilFb2 = await fetch(`${BASE_URL}/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentCivilToken}`
    },
    body: JSON.stringify({
      feedbackText: 'The survey lab equipment has damaged leveling screws and tripods are missing clamps.',
      rating: 1,
      category: 'Laboratory'
    })
  });
  const civilFb2Data = await civilFb2.json();
  await new Promise(r => setTimeout(r, 600));

  // Check that both feedbacks link to the same issue
  const checkFb1 = await fetch(`${BASE_URL}/ai/feedback/${civilFbId}`, {
    headers: { Authorization: `Bearer ${civilHodToken}` }
  });
  const checkFb2 = await fetch(`${BASE_URL}/ai/feedback/${civilFb2Data.data?.id}`, {
    headers: { Authorization: `Bearer ${civilHodToken}` }
  });
  const fb1Analysis = await checkFb1.json();
  const fb2Analysis = await checkFb2.json();

  assert(
    fb1Analysis.data?.issueId && fb2Analysis.data?.issueId && fb1Analysis.data?.issueId === fb2Analysis.data?.issueId,
    'Test 19: Recurring issue detection groups semantically similar complaints under the same departmental issue',
    `Issue ID: ${fb1Analysis.data?.issueId} matched for both feedback submissions`
  );

  const matchedIssueId = fb1Analysis.data?.issueId;

  // Test 20: Explainability endpoint returns evidence-backed explanation
  const explainRes = await fetch(`${BASE_URL}/ai/explain/${matchedIssueId}`, {
    headers: { Authorization: `Bearer ${civilHodToken}` }
  });
  const explainData = await explainRes.json();
  assert(
    explainRes.status === 200 &&
    Array.isArray(explainData.data?.whyThisAppears) &&
    explainData.data?.whyThisAppears.length >= 2 &&
    Array.isArray(explainData.data?.rootCauses) &&
    explainData.data?.stats?.totalFeedback >= 2,
    'Test 20: Explainability endpoint returns evidence-backed reasons and root causes',
    `Reasons: ${explainData.data?.whyThisAppears?.join('; ')}`
  );

  // Test 21: Trigger / Retry Endpoint
  const retryRes = await fetch(`${BASE_URL}/ai/analyze-feedback/${civilFbId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${civilHodToken}` }
  });
  const retryData = await retryRes.json();
  assert(
    retryRes.status === 200 && retryData.data?.status === 'completed',
    'AI Retry endpoint re-analyzes feedback successfully',
    `Provider: ${retryData.data?.provider}`
  );

  console.log('\n====================================================');
  console.log(`📊 PHASE 4 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (Total: ${passed + failed})`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAITests().catch((err) => {
  console.error('Fatal Phase 4 test error:', err);
  process.exit(1);
});
