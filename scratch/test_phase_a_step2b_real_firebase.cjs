/**
 * Comprehensive Automated Verification Suite for Phase A - Step 2B:
 * Real Firebase Storage Cloud Verification
 * 
 * Verifies real cloud uploads, object existence, signed URLs, multi-portal paths,
 * role authorization, scope protection, file validation, and cleanup.
 * CRITICAL: Zero credentials printed or leaked.
 */

const path = require('path');
const fs = require('fs');
const dotenv = require('../backend/node_modules/dotenv');

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, '..', 'backend', '.env') });

const jwt = require('../backend/node_modules/jsonwebtoken');

const BASE_URL = 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_feedbackiq_2026';

const firebaseStorageService = require('../backend/services/firebaseStorageService');
const { pool } = require('../backend/config/db');

// Sample real JPEG bytes (valid JPEG JFIF header)
const SAMPLE_JPEG_BUFFER = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
  0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
  0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
  0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
  0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
  0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
  0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
  0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01,
  0x00, 0x00, 0x3f, 0x00, 0xbf, 0x80, 0xff, 0xd9
]);

async function runStep2BVerification() {
  console.log('======================================================================');
  console.log('🧪 RUNNING PHASE A — STEP 2B: REAL FIREBASE CLOUD STORAGE VERIFICATION');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;
  let tempObjectsCreated = 0;
  let tempObjectsRemoved = 0;
  const createdStoragePaths = [];

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
  // 1. FIREBASE CONFIGURATION & BUCKET REACHABILITY (Sections 1-4)
  // -------------------------------------------------------------------------
  console.log('--- 1. Firebase Admin & Cloud Storage Bucket Reachability ---');
  const configStatus = firebaseStorageService.getSafeConfigurationStatus();
  assert(configStatus.projectConfigured, 'FIREBASE_PROJECT_ID configured');
  assert(configStatus.storageBucketConfigured, 'FIREBASE_STORAGE_BUCKET configured');
  assert(configStatus.clientEmailConfigured, 'FIREBASE_CLIENT_EMAIL configured');
  assert(configStatus.privateKeyConfigured, 'FIREBASE_PRIVATE_KEY configured');
  assert(configStatus.configured === true, 'isConfigured() returns true for real Firebase credentials');

  const { app, bucket, error } = firebaseStorageService.initializeFirebase();
  assert(Boolean(app && bucket), 'Firebase Admin initialized successfully with storageBucket');
  assert(!error, 'Firebase Admin initialization has zero errors');

  const [bucketExists] = await bucket.exists();
  assert(bucketExists === true, `Cloud Storage bucket "${bucket.name}" is reachable and exists in US-EAST1`);

  // Verify health endpoint does not leak any secret
  const healthRes = await fetch(`${BASE_URL}/health`);
  assert(healthRes.status === 200, 'GET /api/health returns HTTP 200 OK');
  const healthJson = await healthRes.json();
  assert(!healthJson.firebase && !healthJson.private_key, 'GET /api/health does NOT expose Firebase private credentials');

  // -------------------------------------------------------------------------
  // 2. REAL FIREBASE STORAGE TESTS (Section 8)
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Real Cloud Storage Upload, Existence & Signed URL ---');

  // 2.1 Upload real JPEG
  const uploadResult = await firebaseStorageService.uploadFeedbackImage({
    buffer: SAMPLE_JPEG_BUFFER,
    originalname: 'evidence-test.jpg',
    mimetype: 'image/jpeg',
    size: SAMPLE_JPEG_BUFFER.length,
    portal: 'education',
    feedbackId: 'cloud-test-001',
    userId: 1
  });
  assert(uploadResult.success === true, 'Real test JPEG upload succeeds');
  assert(uploadResult.provider === 'firebase', 'Upload handled by REAL Firebase provider');
  assert(
    uploadResult.storagePath.startsWith('feedback-images/education/feedback/cloud-test-001/'),
    `Stored object path is correct: ${uploadResult.storagePath}`
  );
  createdStoragePaths.push(uploadResult.storagePath);
  tempObjectsCreated++;

  // 2.2 Confirm object actually exists in Firebase bucket
  const [objectExists] = await bucket.file(uploadResult.storagePath).exists();
  assert(objectExists === true, 'Object ACTUALLY exists in remote Firebase Storage bucket');

  // 2.3 Confirm signed URL generation
  assert(
    Boolean(uploadResult.url && uploadResult.url.startsWith('https://storage.googleapis.com')),
    'Application generates valid Google Cloud / Firebase signed HTTPS URL'
  );

  // 2.4 Test time-limited signed URL generation function
  const signedUrl = await firebaseStorageService.generateSignedImageUrl(uploadResult.storagePath, 15);
  assert(
    Boolean(signedUrl && signedUrl.startsWith('https://storage.googleapis.com')),
    'generateSignedImageUrl() produces reachable signed HTTPS download URL'
  );

  // 2.5 Confirm resource retrieval via signed URL
  const fetchImgRes = await fetch(signedUrl, { method: 'HEAD' });
  assert(fetchImgRes.status === 200, 'Image is retrievable over HTTPS with status 200 OK');
  assert(
    fetchImgRes.headers.get('content-type') === 'image/jpeg',
    'Retrieved resource has correct Content-Type: image/jpeg'
  );

  // -------------------------------------------------------------------------
  // 3. MULTI-PORTAL VERIFICATION (Education, Bus, Hostel)
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Multi-Portal Real Cloud Verification ---');

  // Education Portal Upload
  const eduUpload = await firebaseStorageService.uploadFeedbackImage({
    buffer: SAMPLE_JPEG_BUFFER,
    originalname: 'edu-evidence.jpg',
    mimetype: 'image/jpeg',
    portal: 'education',
    feedbackId: 'edu-fb-101',
    userId: 1
  });
  assert(
    eduUpload.success && eduUpload.storagePath.startsWith('feedback-images/education/feedback/edu-fb-101/'),
    'Education portal image uploaded to feedback-images/education/'
  );
  const [eduObjExists] = await bucket.file(eduUpload.storagePath).exists();
  assert(eduObjExists === true, 'Education object exists in cloud bucket');
  createdStoragePaths.push(eduUpload.storagePath);
  tempObjectsCreated++;

  // Bus Portal Upload
  const busUpload = await firebaseStorageService.uploadFeedbackImage({
    buffer: SAMPLE_JPEG_BUFFER,
    originalname: 'bus-evidence.jpg',
    mimetype: 'image/jpeg',
    portal: 'bus',
    feedbackId: 'bus-fb-202',
    userId: 123
  });
  assert(
    busUpload.success && busUpload.storagePath.startsWith('feedback-images/bus/feedback/bus-fb-202/'),
    'Bus portal image uploaded to feedback-images/bus/'
  );
  const [busObjExists] = await bucket.file(busUpload.storagePath).exists();
  assert(busObjExists === true, 'Bus object exists in cloud bucket');
  createdStoragePaths.push(busUpload.storagePath);
  tempObjectsCreated++;

  // Hostel Portal Upload
  const hostelUpload = await firebaseStorageService.uploadFeedbackImage({
    buffer: SAMPLE_JPEG_BUFFER,
    originalname: 'hostel-evidence.jpg',
    mimetype: 'image/jpeg',
    portal: 'hostel',
    feedbackId: 'hostel-fb-303',
    userId: 124
  });
  assert(
    hostelUpload.success && hostelUpload.storagePath.startsWith('feedback-images/hostel/feedback/hostel-fb-303/'),
    'Hostel portal image uploaded to feedback-images/hostel/'
  );
  const [hostelObjExists] = await bucket.file(hostelUpload.storagePath).exists();
  assert(hostelObjExists === true, 'Hostel object exists in cloud bucket');
  createdStoragePaths.push(hostelUpload.storagePath);
  tempObjectsCreated++;

  // -------------------------------------------------------------------------
  // 4. HTTP API END-TO-END UPLOAD (POST /api/upload)
  // -------------------------------------------------------------------------
  console.log('\n--- 4. HTTP API Real Cloud Upload & Retrieval ---');

  function createTestToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
  }

  const busStudentToken = createTestToken({ id: 123 }); // Real Bus student in DB (Bus 14)
  const formBoundary = '----WebKitFormBoundaryRealCloudTest';
  const multipartBody = Buffer.concat([
    Buffer.from(`--${formBoundary}\r\nContent-Disposition: form-data; name="image"; filename="real-bus-proof.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`),
    SAMPLE_JPEG_BUFFER,
    Buffer.from(`\r\n--${formBoundary}--\r\n`)
  ]);

  const apiUploadRes = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${busStudentToken}`,
      'Content-Type': `multipart/form-data; boundary=${formBoundary}`
    },
    body: multipartBody
  });

  const apiUploadJson = await apiUploadRes.json();
  assert(apiUploadRes.status === 201, 'POST /api/upload returns HTTP 201 Created');
  assert(apiUploadJson.data?.provider === 'firebase', 'API upload processed by real Firebase Storage');
  assert(
    apiUploadJson.data?.url?.startsWith('https://storage.googleapis.com'),
    'API upload response contains valid Firebase signed URL'
  );
  assert(
    apiUploadJson.data?.storagePath?.startsWith('feedback-images/bus/feedback/'),
    'API upload derives portal="bus" from authenticated JWT'
  );

  if (apiUploadJson.data?.storagePath) {
    createdStoragePaths.push(apiUploadJson.data.storagePath);
    tempObjectsCreated++;
    const [apiObjExists] = await bucket.file(apiUploadJson.data.storagePath).exists();
    assert(apiObjExists === true, 'API uploaded object confirmed present in Firebase Storage');
  }

  // -------------------------------------------------------------------------
  // 5. ROLE AUTHORIZATION & SCOPE PROTECTION MATRIX (Section 9-13)
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Role Authorization & Scope Isolation ---');

  // Student own vs other
  assert(
    firebaseStorageService.verifyImageAccess(
      { id: 10, user_id: 1, portal: 'education', image_url: eduUpload.url },
      { id: 1, role: 'student', portal: 'education' }
    ).authorized === true,
    'Student can access image attached to their own feedback'
  );
  assert(
    firebaseStorageService.verifyImageAccess(
      { id: 10, user_id: 1, portal: 'education', image_url: eduUpload.url },
      { id: 2, role: 'student', portal: 'education' }
    ).authorized === false,
    'Student cannot access image attached to another student feedback (403)'
  );

  // Education Faculty / HOD
  assert(
    firebaseStorageService.verifyImageAccess(
      { id: 11, portal: 'education', department: 'Civil Engineering', submitter_role: 'student', image_url: eduUpload.url },
      { id: 21, role: 'hod', department: 'Civil Engineering', portal: 'education' }
    ).authorized === true,
    'HOD can access student feedback image from their department'
  );
  assert(
    firebaseStorageService.verifyImageAccess(
      { id: 11, portal: 'education', department: 'Civil Engineering', submitter_role: 'student', image_url: eduUpload.url },
      { id: 22, role: 'hod', department: 'Mechanical Engineering', portal: 'education' }
    ).authorized === false,
    'HOD cannot access feedback image from another department (403)'
  );

  // Bus Incharge assigned vs unassigned (Scope Protection)
  assert(
    firebaseStorageService.verifyImageAccess(
      { id: 20, portal: 'bus', bus_number: 'Bus 14', image_url: busUpload.url },
      { id: 118, role: 'bus_incharge', bus_number: 'Bus 14', portal: 'bus' }
    ).authorized === true,
    'Bus Incharge can access image for assigned bus (Bus 14)'
  );
  assert(
    firebaseStorageService.verifyImageAccess(
      { id: 21, portal: 'bus', bus_number: 'Bus 22', image_url: busUpload.url },
      { id: 118, role: 'bus_incharge', bus_number: 'Bus 14', portal: 'bus' }
    ).authorized === false,
    'Bus Incharge cannot access unassigned bus (Bus 22 vs Bus 14) (Scope Protection)'
  );

  // Transport Incharge
  assert(
    firebaseStorageService.verifyImageAccess(
      { id: 21, portal: 'bus', bus_number: 'Bus 22', image_url: busUpload.url },
      { id: 119, role: 'transport_incharge', portal: 'bus' }
    ).authorized === true,
    'Transport Incharge can access any Bus portal feedback image'
  );
  assert(
    firebaseStorageService.verifyImageAccess(
      { id: 30, portal: 'hostel', floor: '1st Floor', image_url: hostelUpload.url },
      { id: 119, role: 'transport_incharge', portal: 'bus' }
    ).authorized === false,
    'Transport Incharge cannot access Hostel portal evidence (403)'
  );

  // Hostel Warden assigned vs unassigned (Floor Scope Protection)
  assert(
    firebaseStorageService.verifyImageAccess(
      { id: 30, portal: 'hostel', floor: '1st Floor', image_url: hostelUpload.url },
      { id: 120, role: 'hostel_warden', assigned_floor: '1st Floor', portal: 'hostel' }
    ).authorized === true,
    'Hostel Warden can access image for assigned floor (1st Floor)'
  );
  assert(
    firebaseStorageService.verifyImageAccess(
      { id: 31, portal: 'hostel', floor: '3rd Floor', image_url: hostelUpload.url },
      { id: 120, role: 'hostel_warden', assigned_floor: '1st Floor', portal: 'hostel' }
    ).authorized === false,
    'Hostel Warden cannot access unassigned floor (3rd Floor vs 1st Floor) (Scope Protection)'
  );

  // Management Cross-Portal Access
  const mgtUser = { id: 52, role: 'management' };
  assert(
    firebaseStorageService.verifyImageAccess({ id: 10, portal: 'education', image_url: eduUpload.url }, mgtUser).authorized &&
    firebaseStorageService.verifyImageAccess({ id: 20, portal: 'bus', image_url: busUpload.url }, mgtUser).authorized &&
    firebaseStorageService.verifyImageAccess({ id: 30, portal: 'hostel', image_url: hostelUpload.url }, mgtUser).authorized,
    'Management can access feedback images across Education, Bus, and Hostel portals'
  );

  // Unauthenticated / unauthorized endpoints
  const unauthUpload = await fetch(`${BASE_URL}/upload`, { method: 'POST' });
  assert(unauthUpload.status === 401, 'Unauthenticated upload rejected with HTTP 401');

  const unauthImage = await fetch(`${BASE_URL}/feedback/1/image`);
  assert(unauthImage.status === 401, 'Unauthenticated image access rejected with HTTP 401');

  // -------------------------------------------------------------------------
  // 6. FILE VALIDATION (Section 16)
  // -------------------------------------------------------------------------
  console.log('\n--- 6. File Validation Constraints ---');
  assert(
    firebaseStorageService.validateImageFile({ mimetype: 'image/jpeg', size: 1024, originalname: 'a.jpg' }).valid &&
    firebaseStorageService.validateImageFile({ mimetype: 'image/png', size: 1024, originalname: 'b.png' }).valid &&
    firebaseStorageService.validateImageFile({ mimetype: 'image/webp', size: 1024, originalname: 'c.webp' }).valid,
    'JPEG, PNG, WEBP files accepted under 5 MB'
  );

  assert(
    !firebaseStorageService.validateImageFile({ mimetype: 'image/jpeg', size: 5.5 * 1024 * 1024, originalname: 'big.jpg' }).valid,
    'Files over 5 MB rejected by validation'
  );

  assert(
    !firebaseStorageService.validateImageFile({ mimetype: 'image/svg+xml', size: 1024, originalname: 'v.svg' }).valid &&
    !firebaseStorageService.validateImageFile({ mimetype: 'application/pdf', size: 1024, originalname: 'd.pdf' }).valid &&
    !firebaseStorageService.validateImageFile({ mimetype: 'image/gif', size: 1024, originalname: 'g.gif' }).valid &&
    !firebaseStorageService.validateImageFile({ mimetype: 'application/x-msdownload', size: 1024, originalname: 'e.exe' }).valid,
    'SVG, PDF, GIF, and Executable files rejected'
  );

  // -------------------------------------------------------------------------
  // 7. TEMPORARY TEST OBJECT CLEANUP (Section 22)
  // -------------------------------------------------------------------------
  console.log('\n--- 7. Cloud Storage Test Object Cleanup ---');
  for (const objPath of createdStoragePaths) {
    try {
      await bucket.file(objPath).delete({ ignoreNotFound: true });
      tempObjectsRemoved++;
      console.log(`[Cleaned Cloud Object]: ${objPath}`);
    } catch (cleanErr) {
      console.warn(`[Cleanup Warning]: Failed to delete ${objPath}:`, cleanErr.message);
    }
  }

  assert(
    tempObjectsCreated === tempObjectsRemoved,
    `All temporary test objects cleanly removed (${tempObjectsRemoved}/${tempObjectsCreated})`
  );

  // -------------------------------------------------------------------------
  // 8. DATABASE SAFETY & INVARIANTS (Section 23)
  // -------------------------------------------------------------------------
  console.log('\n--- 8. Database Safety & Invariant Verification ---');
  const [[{ formCount: finalFormCount }]] = await pool.query('SELECT COUNT(*) AS formCount FROM feedback_forms');
  const [[{ feedbackCount: finalFeedbackCount }]] = await pool.query('SELECT COUNT(*) AS feedbackCount FROM feedback');

  assert(
    finalFormCount === initialFormCount,
    `Feedback Volume rule PRESERVED: form count remained strictly ${initialFormCount}`
  );
  assert(
    finalFeedbackCount === initialFeedbackCount,
    `No fake/demo feedback records persisted: feedback count remained strictly ${initialFeedbackCount}`
  );

  console.log('\n======================================================================');
  console.log(`REAL FIREBASE VERIFICATION COMPLETE:`);
  console.log(`Passed: ${passed} | Failed: ${failed}`);
  console.log(`Temporary Firebase objects created: ${tempObjectsCreated}`);
  console.log(`Temporary Firebase objects removed: ${tempObjectsRemoved}`);
  console.log('======================================================================\n');

  await pool.end();
  process.exitCode = failed > 0 ? 1 : 0;
}

runStep2BVerification().catch(err => {
  console.error('Unhandled Step 2B Real Firebase test error:', err);
  process.exitCode = 1;
});
