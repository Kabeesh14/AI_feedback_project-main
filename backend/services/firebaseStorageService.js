const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getStorage } = require('firebase-admin/storage');
const path = require('path');
const fs = require('fs');
const { isMatchingBus } = require('../utils/busUtils');

// Ensure environment variables from backend/.env are loaded
if (!process.env.FIREBASE_PROJECT_ID) {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
}


// Allowed image size limits: 5 KB to 500 KB
const MIN_IMAGE_SIZE_BYTES = 5 * 1024; // 5 KB
const MAX_IMAGE_SIZE_BYTES = 500 * 1024; // 500 KB

// Allowed image MIME types (Section 6)
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Allowed file extensions
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

// Storage directories root (Section 3)
const FEEDBACK_IMAGES_PREFIX = 'feedback-images';

let firebaseApp = null;
let storageBucket = null;

/**
 * Check if all required Firebase environment variables are configured
 * @returns {boolean}
 */
function isConfigured() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const storageBucketName = process.env.FIREBASE_STORAGE_BUCKET;

  return Boolean(
    projectId &&
    projectId.trim() &&
    clientEmail &&
    clientEmail.trim() &&
    privateKey &&
    privateKey.trim() &&
    storageBucketName &&
    storageBucketName.trim()
  );
}

/**
 * Initialize Firebase Admin SDK if configured
 */
function initializeFirebase() {
  if (firebaseApp) return { app: firebaseApp, bucket: storageBucket };

  if (!isConfigured()) {
    return { app: null, bucket: null };
  }

  try {
    const projectId = process.env.FIREBASE_PROJECT_ID.trim();
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL.trim();
    let privateKey = process.env.FIREBASE_PRIVATE_KEY.trim();

    // Replace escaped newlines if passed in single-line env var
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }

    const bucketName = process.env.FIREBASE_STORAGE_BUCKET.trim().replace(/^gs:\/\//, '');

    console.log('[Firebase Storage Configuration]:');
    console.log('Firebase project configured: YES');
    console.log('Firebase storage bucket configured: YES');
    console.log('Firebase private key configured: YES');

    const existingApps = getApps();
    if (existingApps.length > 0) {
      firebaseApp = existingApps[0];
    } else {
      firebaseApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey
        }),
        storageBucket: bucketName
      });
    }

    storageBucket = getStorage(firebaseApp).bucket(bucketName);
    console.log(`✅ [Firebase Storage]: Successfully initialized bucket for project "${projectId}".`);
    return { app: firebaseApp, bucket: storageBucket };

  } catch (error) {
    console.error(`❌ [Firebase Storage Init Error]: ${error.message}`);
    return { app: null, bucket: null, error };
  }
}

/**
 * Get safe non-sensitive configuration status (Section 6)
 * @returns {Object}
 */
function getSafeConfigurationStatus() {
  return {
    configured: isConfigured(),
    projectConfigured: Boolean(process.env.FIREBASE_PROJECT_ID?.trim()),
    storageBucketConfigured: Boolean(process.env.FIREBASE_STORAGE_BUCKET?.trim()),
    clientEmailConfigured: Boolean(process.env.FIREBASE_CLIENT_EMAIL?.trim()),
    privateKeyConfigured: Boolean(process.env.FIREBASE_PRIVATE_KEY?.trim()),
    fallbackMode: !isConfigured()
  };
}


/**
 * Validate an image file's MIME type and size
 * @param {Object} file - { mimetype, size, originalname }
 * @returns {{ valid: boolean, error?: string }}
 */
function validateImageFile(file) {
  if (!file) {
    return { valid: false, error: 'No image file provided.' };
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return {
      valid: false,
      error: `Invalid file type "${file.mimetype}". Only JPEG, PNG, and WEBP image files are allowed.`
    };
  }

  // Check file extension
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (ext && !ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `Invalid file extension "${ext}". Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}.`
    };
  }

  // Check file size (5 KB min, 500 KB max)
  if (file.size < MIN_IMAGE_SIZE_BYTES) {
    const sizeKb = (file.size / 1024).toFixed(1);
    return {
      valid: false,
      error: `File size (${sizeKb} KB) is below the minimum allowed limit of 5 KB.`
    };
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    const sizeKb = (file.size / 1024).toFixed(1);
    return {
      valid: false,
      error: `File size (${sizeKb} KB) exceeds the maximum allowed limit of 500 KB.`
    };
  }

  return { valid: true };
}

/**
 * Build portal-aware storage path for feedback images (Section 3)
 * Structure: feedback-images/{portal}/feedback/{feedbackId}/{filename}
 */
function buildFeedbackStoragePath({ portal = 'education', feedbackId = 'pending', originalname }) {
  const normPortal = (portal || 'education').toLowerCase().trim();
  const validPortal = ['education', 'bus', 'hostel'].includes(normPortal) ? normPortal : 'education';
  const ext = path.extname(originalname || '').toLowerCase() || '.png';
  const cleanExt = ALLOWED_EXTENSIONS.includes(ext) ? ext : '.png';
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const filename = `img-${uniqueSuffix}${cleanExt}`;

  return {
    storagePath: `${FEEDBACK_IMAGES_PREFIX}/${validPortal}/feedback/${feedbackId}/${filename}`,
    filename,
    portal: validPortal
  };
}

/**
 * Upload an image to Firebase Storage or local fallback storage
 * @param {Object} params
 * @param {Buffer} params.buffer - Image binary buffer
 * @param {string} params.originalname - Original uploaded filename
 * @param {string} params.mimetype - Image MIME type
 * @param {number} params.size - Image file size
 * @param {string} params.portal - 'education' | 'bus' | 'hostel'
 * @param {string|number} [params.feedbackId] - Target feedback ID or 'pending'
 * @param {string|number} [params.userId] - Uploader user ID
 * @returns {Promise<{ success: boolean, url: string, storagePath: string, filename: string, provider: 'firebase'|'local_fallback' }>}
 */
async function uploadFeedbackImage({
  buffer,
  originalname,
  mimetype,
  size,
  portal = 'education',
  feedbackId = 'pending',
  userId = null
}) {
  // 1. Validate file constraints
  const validation = validateImageFile({ mimetype, size: size || buffer.length, originalname });
  if (!validation.valid) {
    const err = new Error(validation.error);
    err.statusCode = 400;
    throw err;
  }

  // 2. Generate portal-aware path
  const { storagePath, filename, portal: validPortal } = buildFeedbackStoragePath({
    portal,
    feedbackId,
    originalname
  });

  // 3. Check if Firebase is configured
  const { bucket } = initializeFirebase();

  if (bucket) {
    // Live Firebase Cloud Storage upload
    try {
      const file = bucket.file(storagePath);
      await file.save(buffer, {
        metadata: {
          contentType: mimetype,
          metadata: {
            portal: validPortal,
            feedbackId: String(feedbackId),
            uploadedBy: String(userId || ''),
            uploadedAt: new Date().toISOString(),
            originalName: originalname
          }
        },
        resumable: false
      });

      // Generate a long-lived secure signed URL or public download URL
      // Firebase Storage supports signed URLs up to years into future
      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: '03-01-2035'
      });

      return {
        success: true,
        url: signedUrl,
        storagePath,
        filename,
        provider: 'firebase',
        portal: validPortal
      };
    } catch (fbError) {
      console.error(`[Firebase Storage Upload Error]: ${fbError.message}`);
      throw new Error(`Firebase Storage upload failed: ${fbError.message}`);
    }
  }

  // 4. Local Development Fallback Storage (when credentials not set)
  // Maintains exact same portal-aware folder structure locally
  const localTargetDir = path.join(__dirname, '..', 'uploads', FEEDBACK_IMAGES_PREFIX, validPortal, 'feedback', String(feedbackId));
  if (!fs.existsSync(localTargetDir)) {
    fs.mkdirSync(localTargetDir, { recursive: true });
  }

  const localFilePath = path.join(localTargetDir, filename);
  fs.writeFileSync(localFilePath, buffer);

  const localUrl = `/uploads/${FEEDBACK_IMAGES_PREFIX}/${validPortal}/feedback/${feedbackId}/${filename}`;

  return {
    success: true,
    url: localUrl,
    storagePath,
    filename,
    provider: 'local_fallback',
    portal: validPortal,
    message: 'Uploaded to local development storage (Firebase credentials not configured).'
  };
}

/**
 * Verify if an authenticated user is authorized to view a feedback's image (Section 9)
 * @param {Object} feedbackRecord - Database feedback record
 * @param {Object} user - Authenticated user from JWT
 * @returns {{ authorized: boolean, reason?: string }}
 */
function verifyImageAccess(feedbackRecord, user) {
  if (!feedbackRecord) {
    return { authorized: false, reason: 'Feedback not found.' };
  }

  if (!user) {
    return { authorized: false, reason: 'Authentication required.' };
  }

  const portal = (feedbackRecord.portal || 'education').toLowerCase();

  // Management has cross-portal institutional oversight
  if (user.role === 'management') {
    return { authorized: true };
  }

  // Student: can only view own feedback images
  if (user.role === 'student') {
    if (feedbackRecord.user_id === user.id) {
      return { authorized: true };
    }
    return { authorized: false, reason: 'Forbidden: Students can only view images attached to their own feedback.' };
  }

  // Bus Incharge: only for their assigned bus
  if (user.role === 'bus_incharge') {
    if (portal === 'bus' && (!user.bus_number || isMatchingBus(feedbackRecord.bus_number, user.bus_number))) {
      return { authorized: true };
    }
    return { authorized: false, reason: `Forbidden: Bus Incharge can only view images for their assigned bus (${user.bus_number}).` };
  }

  // Transport Incharge: all bus feedback
  if (user.role === 'transport_incharge') {
    if (portal === 'bus') {
      return { authorized: true };
    }
    return { authorized: false, reason: 'Forbidden: Transport Incharge can only view Bus Portal images.' };
  }

  // Hostel Warden: only for their assigned floor
  if (user.role === 'hostel_warden') {
    const wardenFloor = user.assigned_floor || user.floor;
    if (portal === 'hostel' && feedbackRecord.floor && wardenFloor &&
        feedbackRecord.floor.trim().toLowerCase() === wardenFloor.trim().toLowerCase()) {
      return { authorized: true };
    }
    return { authorized: false, reason: `Forbidden: Hostel Warden can only view images for their assigned floor (${wardenFloor}).` };
  }

  // Faculty: Education portal, student submissions from own department
  if (user.role === 'faculty') {
    if (portal === 'education' && feedbackRecord.department && user.department &&
        feedbackRecord.department.trim().toLowerCase() === user.department.trim().toLowerCase()) {
      // Faculty cannot view peer faculty feedback unless own
      if (feedbackRecord.submitter_role === 'faculty' && feedbackRecord.user_id !== user.id) {
        return { authorized: false, reason: 'Forbidden: Faculty cannot view images from peer faculty feedback.' };
      }
      // Strict restriction: Faculty MUST NOT view student issue images
      const campusSectors = [
        'Library', 'Food / Canteen', 'Canteen', 'Food', 'Classroom',
        'Laboratory', 'Restroom', 'Furniture / Infrastructure', 'Infrastructure',
        'Computer / IT', 'Internet', 'Electricity', 'Other campus facilities', 'Other'
      ];
      if (feedbackRecord.user_id !== user.id && campusSectors.includes(feedbackRecord.category)) {
        return { authorized: false, reason: 'Forbidden: Faculty members are not authorized to view student issue images.' };
      }
      return { authorized: true };
    }
    return { authorized: false, reason: `Forbidden: Faculty can only view Education images from their department (${user.department}).` };
  }

  // HOD: Education portal, own department
  if (user.role === 'hod') {
    if (portal === 'education' && feedbackRecord.department && user.department &&
        feedbackRecord.department.trim().toLowerCase() === user.department.trim().toLowerCase()) {
      return { authorized: true };
    }
    return { authorized: false, reason: `Forbidden: HOD can only view Education images from their department (${user.department}).` };
  }

  return { authorized: false, reason: 'Forbidden: User not authorized to access this feedback image.' };
}

/**
 * Generate a secure time-limited signed URL for viewing an image (Section 10 & 14)
 * @param {string} storagePath - Path in bucket
 * @param {number} [expiresInMinutes=15] - Time to live
 * @returns {Promise<string|null>}
 */
async function generateSignedImageUrl(storagePath, expiresInMinutes = 15) {
  if (!storagePath) return null;

  const { bucket } = initializeFirebase();
  if (bucket) {
    try {
      const file = bucket.file(storagePath);
      const [exists] = await file.exists();
      if (!exists) return null;

      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + expiresInMinutes * 60 * 1000
      });
      return signedUrl;
    } catch (err) {
      console.error(`[Signed URL Error]: ${err.message}`);
      return null;
    }
  }

  // If local fallback storage
  return `/uploads/${storagePath}`;
}

module.exports = {
  isConfigured,
  getSafeConfigurationStatus,
  initializeFirebase,
  validateImageFile,
  buildFeedbackStoragePath,
  uploadFeedbackImage,
  verifyImageAccess,
  generateSignedImageUrl,
  MIN_IMAGE_SIZE_BYTES,
  MAX_IMAGE_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS
};

