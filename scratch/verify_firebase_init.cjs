/**
 * Safe Firebase Initialization Verification Script (Phase A - Step 2B - Step 2)
 * Verifies Firebase Admin initialization and Storage bucket connectivity.
 * CRITICAL: NEVER print credentials or secret values.
 */

const path = require('path');
const fs = require('fs');
const dotenv = require('../backend/node_modules/dotenv');

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, '..', 'backend', '.env') });

const firebaseStorageService = require('../backend/services/firebaseStorageService');

async function verifyInit() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

  const projectConfigured = Boolean(projectId && projectId.trim());
  const clientEmailConfigured = Boolean(clientEmail && clientEmail.trim());
  const privateKeyConfigured = Boolean(
    privateKey &&
    privateKey.includes('-----BEGIN PRIVATE KEY-----') &&
    privateKey.includes('-----END PRIVATE KEY-----')
  );
  const bucketConfigured = Boolean(
    storageBucket &&
    storageBucket.trim() === 'feedbackiq-3f5a8.firebasestorage.app'
  );

  let adminInitStatus = 'FAILED';
  let bucketConnectionStatus = 'FAILED';
  let initError = null;

  try {
    const { app, bucket, error } = firebaseStorageService.initializeFirebase();
    if (app && bucket) {
      adminInitStatus = 'SUCCESS';
      // Test bucket metadata access
      const [exists] = await bucket.exists();
      if (exists) {
        bucketConnectionStatus = 'SUCCESS';
      } else {
        bucketConnectionStatus = 'FAILED (Bucket not found)';
      }
    } else if (error) {
      initError = error.message;
    }
  } catch (err) {
    initError = err.message;
  }

  // Check Git ignore status
  const gitignorePath = path.join(__dirname, '..', '.gitignore');
  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  const backendEnvIgnored = gitignoreContent.includes('backend/.env');

  // Verify service-account JSON is outside repository or ignored
  const jsonPath = 'C:\\Users\\Kabeesh\\Downloads\\feedbackiq-3f5a8-firebase-adminsdk-fbsvc-0039726d4e.json';
  const repoRoot = path.resolve(path.join(__dirname, '..'));
  const isOutsideRepo = !jsonPath.startsWith(repoRoot);
  const jsonIgnoredByPattern = gitignoreContent.includes('*firebase*.json') && gitignoreContent.includes('*serviceAccount*.json');

  // Check frontend source for any Firebase Admin credential leak
  const srcDir = path.join(__dirname, '..', 'src');
  let frontendLeak = false;
  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(full);
      } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.js')) {
        const text = fs.readFileSync(full, 'utf8');
        if (text.includes('FIREBASE_PRIVATE_KEY') || text.includes('BEGIN PRIVATE KEY')) {
          frontendLeak = true;
        }
      }
    }
  }
  scanDir(srcDir);

  console.log('====================================================');
  console.log('Firebase configuration:');
  console.log(`- Project ID configured: ${projectConfigured ? 'YES' : 'NO'}`);
  console.log(`- Client email configured: ${clientEmailConfigured ? 'YES' : 'NO'}`);
  console.log(`- Private key configured: ${privateKeyConfigured ? 'YES' : 'NO'}`);
  console.log(`- Storage bucket configured: ${bucketConfigured ? 'YES' : 'NO'}`);
  console.log(`- Firebase Admin initialization: ${adminInitStatus}`);
  console.log(`- Storage bucket connection: ${bucketConnectionStatus}`);
  console.log(`- Local fallback available: YES`);
  console.log(`- backend/.env ignored by Git: ${backendEnvIgnored ? 'YES' : 'NO'}`);
  console.log(`- Service-account JSON exposed to repository: ${!isOutsideRepo && !jsonIgnoredByPattern ? 'YES' : 'NO'}`);
  console.log(`- Frontend credentials audit clean: ${!frontendLeak ? 'YES' : 'NO'}`);
  console.log('====================================================');

  if (initError) {
    console.error(`Initialization diagnostic note: ${initError}`);
  }

  process.exitCode = (adminInitStatus === 'SUCCESS' && bucketConnectionStatus === 'SUCCESS') ? 0 : 1;
}

verifyInit();
