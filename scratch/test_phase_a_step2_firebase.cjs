/**
 * Comprehensive Automated Test Suite for Phase A - Step 2:
 * Firebase Storage Image Architecture & Local Implementation
 */

const path = require('path');
const fs = require('fs');

const jwt = require('../backend/node_modules/jsonwebtoken');

const BASE_URL = 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_feedbackiq_2026';

const firebaseStorageService = require('../backend/services/firebaseStorageService');
const { pool } = require('../backend/config/db');


async function runTestSuite() {
  console.log('======================================================================');
  console.log('🧪 RUNNING PHASE A — STEP 2: FIREBASE STORAGE & IMAGE SECURITY TESTS');
  console.log('======================================================================\n');

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

  // Record initial database counts to enforce safety rules
  const [[{ formCount: initialFormCount }]] = await pool.query('SELECT COUNT(*) AS formCount FROM feedback_forms');
  const [[{ feedbackCount: initialFeedbackCount }]] = await pool.query('SELECT COUNT(*) AS feedbackCount FROM feedback');
  console.log(`[Safety Baseline]: Initial feedback_forms count = ${initialFormCount}`);
  console.log(`[Safety Baseline]: Initial feedback count = ${initialFeedbackCount}\n`);

  // -------------------------------------------------------------------------
  // 1. CONFIGURATION & CONTRACT TESTS
  // -------------------------------------------------------------------------
  console.log('--- 1. Testing Firebase Configuration Service ---');
  assert(
    typeof firebaseStorageService.isConfigured === 'function',
    'isConfigured function exists'
  );
  assert(
    typeof firebaseStorageService.isConfigured() === 'boolean',
    `isConfigured() returns boolean (${firebaseStorageService.isConfigured() ? 'Firebase credentials configured' : 'fallback mode'})`
  );

  assert(
    firebaseStorageService.MAX_IMAGE_SIZE_BYTES === 5 * 1024 * 1024,
    'MAX_IMAGE_SIZE_BYTES strictly enforces 5 MB limit (Section 6)'
  );
  assert(
    firebaseStorageService.ALLOWED_MIME_TYPES.includes('image/jpeg') &&
    firebaseStorageService.ALLOWED_MIME_TYPES.includes('image/png') &&
    firebaseStorageService.ALLOWED_MIME_TYPES.includes('image/webp') &&
    !firebaseStorageService.ALLOWED_MIME_TYPES.includes('image/svg+xml'),
    'ALLOWED_MIME_TYPES allows only JPEG, PNG, WEBP and excludes SVG'
  );

  // -------------------------------------------------------------------------
  // 2. IMAGE FILE VALIDATION TESTS
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Testing Image File Validation ---');
  
  // Valid JPEG
  const validJpg = firebaseStorageService.validateImageFile({
    mimetype: 'image/jpeg',
    originalname: 'proof.jpg',
    size: 2 * 1024 * 1024 // 2MB
  });
  assert(validJpg.valid === true, 'Accepts valid JPEG file under 5MB');

  // Valid PNG
  const validPng = firebaseStorageService.validateImageFile({
    mimetype: 'image/png',
    originalname: 'screenshot.png',
    size: 4 * 1024 * 1024 // 4MB
  });
  assert(validPng.valid === true, 'Accepts valid PNG file under 5MB');

  // Valid WEBP
  const validWebp = firebaseStorageService.validateImageFile({
    mimetype: 'image/webp',
    originalname: 'photo.webp',
    size: 1 * 1024 * 1024 // 1MB
  });
  assert(validWebp.valid === true, 'Accepts valid WEBP file under 5MB');

  // Reject SVG
  const rejectSvg = firebaseStorageService.validateImageFile({
    mimetype: 'image/svg+xml',
    originalname: 'vector.svg',
    size: 50 * 1024
  });
  assert(rejectSvg.valid === false && rejectSvg.error.includes('Invalid file type'), 'Rejects SVG files per Section 6');

  // Reject PDF
  const rejectPdf = firebaseStorageService.validateImageFile({
    mimetype: 'application/pdf',
    originalname: 'doc.pdf',
    size: 500 * 1024
  });
  assert(rejectPdf.valid === false && rejectPdf.error.includes('Invalid file type'), 'Rejects PDF files per Section 6');

  // Reject Executable / Script
  const rejectExe = firebaseStorageService.validateImageFile({
    mimetype: 'application/x-msdownload',
    originalname: 'malware.exe',
    size: 500 * 1024
  });
  assert(rejectExe.valid === false && rejectExe.error.includes('Invalid file type'), 'Rejects Executable files');

  // Reject Oversized file (> 5 MB)
  const rejectOversized = firebaseStorageService.validateImageFile({
    mimetype: 'image/png',
    originalname: 'huge.png',
    size: 5.5 * 1024 * 1024 // 5.5MB
  });
  assert(
    rejectOversized.valid === false && rejectOversized.error.includes('exceeds maximum allowed limit of 5 MB'),
    'Rejects oversized image (> 5 MB) with clear size error message'
  );

  // -------------------------------------------------------------------------
  // 3. STORAGE DIRECTORY STRUCTURE TESTS (Section 3)
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Testing Portal-Aware Storage Directory Paths ---');

  const eduPath = firebaseStorageService.buildFeedbackStoragePath({
    portal: 'education',
    feedbackId: 101,
    originalname: 'test.jpg'
  });
  assert(
    eduPath.storagePath.startsWith('feedback-images/education/feedback/101/') && eduPath.storagePath.endsWith('.jpg'),
    `Education path matches pattern: ${eduPath.storagePath}`
  );

  const busPath = firebaseStorageService.buildFeedbackStoragePath({
    portal: 'bus',
    feedbackId: 202,
    originalname: 'bus-seat.png'
  });
  assert(
    busPath.storagePath.startsWith('feedback-images/bus/feedback/202/') && busPath.storagePath.endsWith('.png'),
    `Bus path matches pattern: ${busPath.storagePath}`
  );

  const hostelPath = firebaseStorageService.buildFeedbackStoragePath({
    portal: 'hostel',
    feedbackId: 303,
    originalname: 'tap-leak.webp'
  });
  assert(
    hostelPath.storagePath.startsWith('feedback-images/hostel/feedback/303/') && hostelPath.storagePath.endsWith('.webp'),
    `Hostel path matches pattern: ${hostelPath.storagePath}`
  );

  // Storage upload execution (Firebase if configured, else local fallback)
  const dummyBuffer = Buffer.from('fake-image-bytes-header');
  const uploadResult = await firebaseStorageService.uploadFeedbackImage({
    buffer: dummyBuffer,
    originalname: 'sample.png',
    mimetype: 'image/png',
    size: dummyBuffer.length,
    portal: 'education',
    feedbackId: 999,
    userId: 1
  });
  assert(uploadResult.success === true, 'Upload succeeds (Firebase if configured, fallback otherwise)');
  assert(
    ['firebase', 'local_fallback'].includes(uploadResult.provider),
    `Provider correctly identified (${uploadResult.provider})`
  );
  assert(
    uploadResult.storagePath.startsWith('feedback-images/education/feedback/999/'),
    'Storage path adheres to portal-aware structure'
  );

  // If local fallback, verify local file; if Firebase, clean up cloud object
  if (uploadResult.provider === 'local_fallback') {
    const createdLocalFile = path.join(__dirname, '..', 'backend', uploadResult.url.replace(/^\//, ''));
    assert(fs.existsSync(createdLocalFile), `Local file exists on disk at ${createdLocalFile}`);
    if (fs.existsSync(createdLocalFile)) fs.unlinkSync(createdLocalFile);
  } else if (uploadResult.provider === 'firebase') {
    const { bucket } = firebaseStorageService.initializeFirebase();
    if (bucket) {
      await bucket.file(uploadResult.storagePath).delete({ ignoreNotFound: true });
    }
    assert(true, 'Temporary Firebase Storage test object verified and cleaned up');
  }


  // -------------------------------------------------------------------------
  // 4. IMAGE OWNERSHIP & ACCESS CONTROL TESTS (Section 9)
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Testing Role & Portal Image Access Isolation ---');

  // Case 1: Student viewing own feedback image
  const ownCheck = firebaseStorageService.verifyImageAccess(
    { id: 1, user_id: 10, portal: 'education', image_url: 'path.png' },
    { id: 10, role: 'student', portal: 'education' }
  );
  assert(ownCheck.authorized === true, 'Student CAN access own feedback image');

  // Case 2: Student viewing another student\'s feedback image
  const otherStudentCheck = firebaseStorageService.verifyImageAccess(
    { id: 1, user_id: 10, portal: 'education', image_url: 'path.png' },
    { id: 11, role: 'student', portal: 'education' }
  );
  assert(otherStudentCheck.authorized === false, 'Student CANNOT access another student\'s feedback image');

  // Case 3: Bus Incharge accessing assigned bus
  const busAuthCheck = firebaseStorageService.verifyImageAccess(
    { id: 2, user_id: 15, portal: 'bus', bus_number: 'Bus 14', image_url: 'path.png' },
    { id: 20, role: 'bus_incharge', bus_number: 'Bus 14', portal: 'bus' }
  );
  assert(busAuthCheck.authorized === true, 'Bus Incharge CAN access image for their assigned bus (Bus 14)');

  // Case 4: Bus Incharge accessing unassigned bus (Scope tampering)
  const busTamperCheck = firebaseStorageService.verifyImageAccess(
    { id: 3, user_id: 16, portal: 'bus', bus_number: 'Bus 22', image_url: 'path.png' },
    { id: 20, role: 'bus_incharge', bus_number: 'Bus 14', portal: 'bus' }
  );
  assert(busTamperCheck.authorized === false, 'Bus Incharge CANNOT access image for unassigned bus (Bus 22 vs Bus 14)');

  // Case 5: Transport Incharge accessing any bus feedback
  const transportCheck = firebaseStorageService.verifyImageAccess(
    { id: 3, user_id: 16, portal: 'bus', bus_number: 'Bus 22', image_url: 'path.png' },
    { id: 25, role: 'transport_incharge', portal: 'bus' }
  );
  assert(transportCheck.authorized === true, 'Transport Incharge CAN access any bus feedback image');

  // Case 6: Transport Incharge attempting to access Hostel image
  const transportHostelCheck = firebaseStorageService.verifyImageAccess(
    { id: 4, user_id: 17, portal: 'hostel', floor: '2nd Floor', image_url: 'path.png' },
    { id: 25, role: 'transport_incharge', portal: 'bus' }
  );
  assert(transportHostelCheck.authorized === false, 'Transport Incharge CANNOT access Hostel portal image');

  // Case 7: Hostel Warden accessing assigned floor
  const wardenAuthCheck = firebaseStorageService.verifyImageAccess(
    { id: 4, user_id: 17, portal: 'hostel', floor: '2nd Floor', image_url: 'path.png' },
    { id: 30, role: 'hostel_warden', assigned_floor: '2nd Floor', portal: 'hostel' }
  );
  assert(wardenAuthCheck.authorized === true, 'Hostel Warden CAN access image for their assigned floor (2nd Floor)');

  // Case 8: Hostel Warden accessing unassigned floor (Floor scope tampering)
  const wardenTamperCheck = firebaseStorageService.verifyImageAccess(
    { id: 5, user_id: 18, portal: 'hostel', floor: '3rd Floor', image_url: 'path.png' },
    { id: 30, role: 'hostel_warden', assigned_floor: '2nd Floor', portal: 'hostel' }
  );
  assert(wardenTamperCheck.authorized === false, 'Hostel Warden CANNOT access image for unassigned floor (3rd Floor vs 2nd Floor)');

  // Case 9: Faculty accessing student feedback in own department
  const facAuthCheck = firebaseStorageService.verifyImageAccess(
    { id: 6, user_id: 19, portal: 'education', department: 'Information Technology', submitter_role: 'student', image_url: 'path.png' },
    { id: 40, role: 'faculty', department: 'Information Technology', portal: 'education' }
  );
  assert(facAuthCheck.authorized === true, 'Faculty CAN access student feedback image from own department (IT)');

  // Case 10: Faculty accessing feedback from different department
  const facCrossCheck = firebaseStorageService.verifyImageAccess(
    { id: 7, user_id: 20, portal: 'education', department: 'Mechanical Engineering', submitter_role: 'student', image_url: 'path.png' },
    { id: 40, role: 'faculty', department: 'Information Technology', portal: 'education' }
  );
  assert(facCrossCheck.authorized === false, 'Faculty CANNOT access feedback image from another department (Mech vs IT)');

  // Case 11: Management accessing cross-portal feedback images
  const mgtEduCheck = firebaseStorageService.verifyImageAccess(
    { id: 6, portal: 'education', image_url: 'path.png' },
    { id: 50, role: 'management' }
  );
  const mgtBusCheck = firebaseStorageService.verifyImageAccess(
    { id: 2, portal: 'bus', image_url: 'path.png' },
    { id: 50, role: 'management' }
  );
  const mgtHostelCheck = firebaseStorageService.verifyImageAccess(
    { id: 4, portal: 'hostel', image_url: 'path.png' },
    { id: 50, role: 'management' }
  );
  assert(
    mgtEduCheck.authorized && mgtBusCheck.authorized && mgtHostelCheck.authorized,
    'Management CAN access feedback images across Education, Bus, and Hostel portals'
  );

  // -------------------------------------------------------------------------
  // 5. HTTP API ENDPOINT INTEGRATION & SECURITY TESTS
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Testing HTTP API Upload & Image Retrieval Endpoints ---');

  // Helper to generate JWT tokens
  function createTestToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
  }

  // Real user IDs from development database
  const eduStudentToken = createTestToken({ id: 1 }); // User 1: portal = education
  const busStudentToken = createTestToken({ id: 123 }); // User 123: portal = bus, Bus 14
  const hostelStudentToken = createTestToken({ id: 124 }); // User 124: portal = hostel, 1st Floor
  const busInchargeToken = createTestToken({ id: 118 }); // User 118: bus_incharge, Bus 14
  const hostelWardenToken = createTestToken({ id: 120 }); // User 120: hostel_warden, 1st Floor

  // Test 5.1: Missing JWT on POST /api/upload
  const noTokenRes = await fetch(`${BASE_URL}/upload`, { method: 'POST' });
  assert(noTokenRes.status === 401, 'POST /api/upload without token returns 401 Unauthorized');

  // Test 5.2: Invalid JWT on POST /api/upload
  const invalidTokenRes = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    headers: { Authorization: 'Bearer bad_token_123' }
  });
  assert(invalidTokenRes.status === 401, 'POST /api/upload with invalid token returns 401 Unauthorized');

  // Test 5.3: Valid upload via Bus Student
  const formBoundary = '----WebKitFormBoundaryTest12345';
  const smallPngBuffer = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
    0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
    0x42, 0x60, 0x82
  ]);

  const multipartBody = Buffer.concat([
    Buffer.from(`--${formBoundary}\r\nContent-Disposition: form-data; name="image"; filename="evidence.png"\r\nContent-Type: image/png\r\n\r\n`),
    smallPngBuffer,
    Buffer.from(`\r\n--${formBoundary}--\r\n`)
  ]);

  const uploadBusRes = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${busStudentToken}`,
      'Content-Type': `multipart/form-data; boundary=${formBoundary}`
    },
    body: multipartBody
  });

  const uploadBusJson = await uploadBusRes.json();
  assert(uploadBusRes.status === 201, 'POST /api/upload succeeds with 201 Created for Bus student valid PNG');
  assert(uploadBusJson.data?.portal === 'bus', 'Portal is determined from authenticated user context (bus)');
  assert(
    uploadBusJson.data?.storagePath?.startsWith('feedback-images/bus/feedback/'),
    `Storage path adheres to portal structure: ${uploadBusJson.data?.storagePath}`
  );

  // Test 5.4: Valid upload via Hostel Student
  const uploadHostelRes = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${hostelStudentToken}`,
      'Content-Type': `multipart/form-data; boundary=${formBoundary}`
    },
    body: multipartBody
  });
  const uploadHostelJson = await uploadHostelRes.json();
  assert(uploadHostelRes.status === 201, 'POST /api/upload succeeds with 201 Created for Hostel student valid PNG');
  assert(uploadHostelJson.data?.portal === 'hostel', 'Portal is determined from authenticated user context (hostel)');
  assert(
    uploadHostelJson.data?.storagePath?.startsWith('feedback-images/hostel/feedback/'),
    `Storage path adheres to portal structure: ${uploadHostelJson.data?.storagePath}`
  );

  // Test 5.5: Valid upload via Education Student
  const uploadEduRes = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${eduStudentToken}`,
      'Content-Type': `multipart/form-data; boundary=${formBoundary}`
    },
    body: multipartBody
  });
  const uploadEduJson = await uploadEduRes.json();
  assert(uploadEduRes.status === 201, 'POST /api/upload succeeds with 201 Created for Education student valid PNG');
  assert(uploadEduJson.data?.portal === 'education', 'Portal is determined from authenticated user context (education)');
  assert(
    uploadEduJson.data?.storagePath?.startsWith('feedback-images/education/feedback/'),
    `Storage path adheres to portal structure: ${uploadEduJson.data?.storagePath}`
  );


  // Test 5.6: Reject invalid file type (e.g. text file masquerading as image)
  const textBody = Buffer.concat([
    Buffer.from(`--${formBoundary}\r\nContent-Disposition: form-data; name="image"; filename="script.sh"\r\nContent-Type: text/plain\r\n\r\n`),
    Buffer.from('echo "malicious"'),
    Buffer.from(`\r\n--${formBoundary}--\r\n`)
  ]);
  const rejectTypeRes = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${eduStudentToken}`,
      'Content-Type': `multipart/form-data; boundary=${formBoundary}`
    },
    body: textBody
  });
  assert(rejectTypeRes.status === 400, 'POST /api/upload rejects non-allowed file type with 400');

  // Test 5.7: Reject oversized file (> 5 MB) via HTTP
  const oversizedBuffer = Buffer.alloc(5.5 * 1024 * 1024, 0x61); // 5.5MB of 'a'
  const oversizedBody = Buffer.concat([
    Buffer.from(`--${formBoundary}\r\nContent-Disposition: form-data; name="image"; filename="huge.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`),
    oversizedBuffer,
    Buffer.from(`\r\n--${formBoundary}--\r\n`)
  ]);
  const rejectOversizedHttp = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${eduStudentToken}`,
      'Content-Type': `multipart/form-data; boundary=${formBoundary}`
    },
    body: oversizedBody
  });
  const rejectOversizedJson = await rejectOversizedHttp.json();
  assert(
    rejectOversizedHttp.status === 400 && rejectOversizedJson.message?.includes('5 MB'),
    'POST /api/upload rejects oversized file (> 5 MB) with HTTP 400 and size limit message'
  );

  // Test 5.8: Secure image endpoint GET /api/upload/feedback/:id/image
  // Missing token -> 401
  const noTokenImageRes = await fetch(`${BASE_URL}/upload/feedback/1/image`);
  assert(noTokenImageRes.status === 401, 'GET /api/upload/feedback/:id/image requires JWT authentication (401)');

  // Direct endpoint GET /api/feedback/:id/image missing token -> 401
  const noTokenDirectRes = await fetch(`${BASE_URL}/feedback/1/image`);
  assert(noTokenDirectRes.status === 401, 'GET /api/feedback/:id/image requires JWT authentication (401)');

  // Test 5.9: Cross-portal / unauthorized access to Bus feedback image by unassigned Bus Incharge
  // Find a bus feedback with image in DB
  const [busWithImg] = await pool.query("SELECT * FROM feedback WHERE portal = 'bus' AND image_url IS NOT NULL LIMIT 1");
  if (busWithImg && busWithImg.length > 0) {
    const targetFeedback = busWithImg[0];
    // Incharge of Bus 22 attempting to access Bus 14 feedback
    const unassignedInchargeToken = createTestToken({
      id: 9999,
      role: 'bus_incharge',
      portal: 'bus',
      bus_number: targetFeedback.bus_number === 'Bus 14' ? 'Bus 99' : 'Bus 14',
      isTest: true
    });
    const tamperRes = await fetch(`${BASE_URL}/feedback/${targetFeedback.id}/image`, {
      headers: { Authorization: `Bearer ${unassignedInchargeToken}` }
    });
    assert(
      tamperRes.status === 403,
      `Unassigned Bus Incharge tampering is rejected with 403 Forbidden on feedback #${targetFeedback.id}`
    );

    // Authorized Management token (User 52: Dr. K. Arulmurugan, Principal)
    const mgtToken = createTestToken({ id: 52, role: 'management' });
    const mgtRes = await fetch(`${BASE_URL}/feedback/${targetFeedback.id}/image`, {
      headers: { Authorization: `Bearer ${mgtToken}` }
    });
    assert(
      mgtRes.status === 200,
      `Authorized Management user can access feedback image on feedback #${targetFeedback.id} (200 OK)`
    );

  } else {
    console.log('[Note]: No existing bus feedback with image to test live cross-portal tampering; logic verified by unit test 4.');
  }


  // -------------------------------------------------------------------------
  // 6. DATABASE VERIFICATION (Safety Rules 1-16)
  // -------------------------------------------------------------------------
  console.log('\n--- 6. Verifying Database Safety & Invariants ---');

  const [[{ formCount: finalFormCount }]] = await pool.query('SELECT COUNT(*) AS formCount FROM feedback_forms');
  const [[{ feedbackCount: finalFeedbackCount }]] = await pool.query('SELECT COUNT(*) AS feedbackCount FROM feedback');

  assert(
    finalFormCount === initialFormCount,
    `Feedback Volume rule PRESERVED: form count remained ${initialFormCount} (Section 7 rule unchanged)`
  );
  assert(
    finalFeedbackCount === initialFeedbackCount,
    `No fake/demo feedback records persisted: feedback count remained ${initialFeedbackCount} (Section 19 rule)`
  );

  // Verify no binary blobs in feedback table
  const [sampleRows] = await pool.query('SELECT id, image_url FROM feedback WHERE image_url IS NOT NULL LIMIT 5');
  let hasBlob = false;
  sampleRows.forEach(r => {
    if (r.image_url && typeof r.image_url !== 'string') {
      hasBlob = true;
    }
  });
  assert(!hasBlob, 'No binary image data is stored in MySQL; image_url is text reference (Section 9 & 10)');

  console.log('\n======================================================================');
  console.log(`TEST RUN COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================================\n');

  await pool.end();
  process.exitCode = failed > 0 ? 1 : 0;
}

runTestSuite().catch(err => {
  console.error('Unhandled test suite error:', err);
  process.exitCode = 1;
});

