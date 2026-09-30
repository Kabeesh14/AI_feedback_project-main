# PHASE A — STEP 2: FIREBASE STORAGE IMAGE ARCHITECTURE & LOCAL IMPLEMENTATION REPORT

**Author:** Antigravity AI  
**Date:** September 30, 2026  
**Status:** PARTIAL — FIREBASE INTEGRATION STRUCTURE IMPLEMENTED; CREDENTIAL-DEPENDENT TESTING PENDING  
**Target Environment:** Local Development Environment (`feedbackiq_db` at `localhost:3306`)  
**Aiven Production Database Status:** FROZEN / UNTOUCHED  

---

## 1. ARCHITECTURE

* **[FACT]** Structured institutional data (users, feedback records, departments, sentiment, pulse scores, analytics) continues to reside entirely in the MySQL database (`feedbackiq_db`).
* **[IMPLEMENTED]** Image binary data is strictly excluded from MySQL. All binary image blobs are directed to **Firebase Cloud Storage** (with an automated, portal-aware local development fallback for zero-credential offline development).
* **[IMPLEMENTED]** MySQL stores only text references (`feedback.image_url`), which are URLs or storage paths (e.g. Firebase signed URLs or local `/uploads/feedback-images/...` paths).
* **[FACT]** Upload and retrieval architecture follows this data flow:

```text
Student (Education / Bus / Hostel)
   │
   │  Multipart or Two-Step Upload (Image + Feedback)
   ↓
FeedbackIQ Backend API (/api/upload, /api/feedback)
   │
   ├── JWT Auth & Role Validation ──► MySQL (users table)
   │
   ├── Binary Image Data ───────────► Firebase Cloud Storage (or Local Fallback Storage)
   │                                   │
   │                                   └── Object: feedback-images/{portal}/feedback/{id}/{filename}
   │
   └── Text Image Reference ────────► MySQL (feedback.image_url)
```

---

## 2. FIREBASE CONFIGURATION

* **[IMPLEMENTED]** Backend configuration is handled exclusively in [firebaseStorageService.js](file:///c:/Users/Kabeesh/Downloads/AI_feedback_project-main/backend/services/firebaseStorageService.js) using environment variables.
* **[IMPLEMENTED]** Environment variable definitions added to [.env.example](file:///c:/Users/Kabeesh/Downloads/AI_feedback_project-main/backend/.env.example):
  ```env
  FIREBASE_PROJECT_ID=your_firebase_project_id
  FIREBASE_CLIENT_EMAIL=your_firebase_client_email@your_project.iam.gserviceaccount.com
  FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_firebase_private_key_here\n-----END PRIVATE KEY-----\n"
  FIREBASE_STORAGE_BUCKET=your_firebase_project_id.appspot.com
  ```
* **[FACT]** No private keys or service account credentials are in frontend code or repository commits.
* **[IMPLEMENTED]** Resilient configuration check: `firebaseStorageService.isConfigured()` checks that all 4 environment variables are present and non-empty. If any are missing, the service activates `local_fallback` mode without crashing the server.

---

## 3. STORAGE DIRECTORY STRUCTURE

* **[IMPLEMENTED]** Strict portal-aware directory structure enforced in [firebaseStorageService.js](file:///c:/Users/Kabeesh/Downloads/AI_feedback_project-main/backend/services/firebaseStorageService.js) via `buildFeedbackStoragePath()`:
  * **Education Portal:**  
    `feedback-images/education/feedback/{feedbackId}/{filename}`
  * **Bus Portal:**  
    `feedback-images/bus/feedback/{feedbackId}/{filename}`
  * **Hostel Portal:**  
    `feedback-images/hostel/feedback/{feedbackId}/{filename}`
* **[IMPLEMENTED]** Filename generation uses cryptographically distinct, timestamped names: `img-${Date.now()}-${random}.${ext}` to prevent namespace collisions.
* **[FUTURE]** Future issue/action evidence path reserved: `issue-images/{portal}/issue/{issueId}/{filename}`.

---

## 4. BACKEND FIREBASE SERVICE

* **[IMPLEMENTED]** Dedicated service created at [backend/services/firebaseStorageService.js](file:///c:/Users/Kabeesh/Downloads/AI_feedback_project-main/backend/services/firebaseStorageService.js).
* **[IMPLEMENTED]** Responsibilities encapsulated:
  1. `isConfigured()`: Safely detects availability of live credentials.
  2. `initializeFirebase()`: Singleton Admin SDK initialization preventing duplicate Firebase apps.
  3. `validateImageFile()`: Validates size, extension, and MIME type.
  4. `buildFeedbackStoragePath()`: Computes portal-aware object keys.
  5. `uploadFeedbackImage()`: Streams memory buffer to Firebase bucket (or writes to matching local directory path) and returns `{ success, url, storagePath, filename, provider, portal }`.
  6. `verifyImageAccess()`: Enforces role-based portal and scope authorization boundaries.
  7. `generateSignedImageUrl()`: Creates time-limited secure URLs for private storage buckets.

---

## 5. IMAGE VALIDATION

* **[IMPLEMENTED]** Backend validation strictly enforced in both [firebaseStorageService.js](file:///c:/Users/Kabeesh/Downloads/AI_feedback_project-main/backend/services/firebaseStorageService.js) and [uploadRoutes.js](file:///c:/Users/Kabeesh/Downloads/AI_feedback_project-main/backend/routes/uploadRoutes.js):
  * **Maximum File Size:** `5 * 1024 * 1024` bytes (5 MB per Section 6).
  * **Allowed MIME Types:**
    * `image/jpeg`
    * `image/png`
    * `image/webp`
  * **Allowed Extensions:** `.jpg`, `.jpeg`, `.png`, `.webp`.
  * **Explicitly Rejected:** SVG files (`image/svg+xml`), PDFs (`application/pdf`), executables (`.exe`, `.sh`), GIFs, videos, and arbitrary non-image binaries.
  * **Response:** Returns `HTTP 400 Bad Request` with clear validation error message.
* **[IMPLEMENTED]** Frontend matching validation updated in [uploadService.ts](file:///c:/Users/Kabeesh/Downloads/AI_feedback_project-main/src/services/uploadService.ts) and [ImageUpload.tsx](file:///c:/Users/Kabeesh/Downloads/AI_feedback_project-main/src/components/common/ImageUpload.tsx).

---

## 6. FEEDBACK IMAGE UPLOAD FLOW

* **[IMPLEMENTED]** Two complementary upload flows are supported:
  1. **Two-Step Upload (Standard Frontend Flow):**
     * Step A: Frontend calls `POST /api/upload` with FormData `image`.
     * Step B: Backend validates 5MB limit + MIME type in memory buffer.
     * Step C: Image uploaded to storage; returns `{ url, storagePath, filename, portal }`.
     * Step D: Frontend sends `POST /api/feedback` with `imageUrl` in JSON payload.
     * Step E: Backend inserts feedback record with `image_url = imageUrl`.
  2. **Atomic Single-Request Upload (Direct Multipart Flow):**
     * Step A: Client POSTs multipart/form-data to `POST /api/feedback` with feedback fields + `image` file.
     * Step B: Backend validates text, rating, category, and image file.
     * Step C: Feedback record inserted into MySQL (`image_url = null`).
     * Step D: Image uploaded to Firebase Storage using the newly generated feedback ID.
     * Step E: MySQL record updated with `image_url = uploadResult.url`.
     * Step F: If Firebase upload fails, the feedback record is deleted/rolled back to prevent orphaned records.
* **[IMPLEMENTED]** Both "Feedback with image" and "Feedback without image" continue to work without disruption.

---

## 7. EDUCATION, BUS & HOSTEL PORTAL INTEGRATIONS

* **[IMPLEMENTED]** The portal is determined **strictly from authenticated backend context (`req.user.portal`)**, never from a client-provided override.
* **Education Portal:**
  * Verified for Education Students (e.g. User #1, Arun Kumar, Department: AI & Data Science).
  * Uploads route to `feedback-images/education/feedback/{id}/{filename}`.
* **Bus Portal:**
  * Verified for Bus Students (e.g. User #123, Bus Test Student, Bus 14).
  * Uploads route to `feedback-images/bus/feedback/{id}/{filename}`.
* **Hostel Portal:**
  * Verified for Hostel Students (e.g. User #124, Hostel Test Student, 1st Floor).
  * Uploads route to `feedback-images/hostel/feedback/{id}/{filename}`.

---

## 8. IMAGE OWNERSHIP & ACCESS CONTROL

* **[IMPLEMENTED]** Dedicated authorization verification implemented in `firebaseStorageService.verifyImageAccess(feedbackRecord, user)`:
  * **Students:** May ONLY view images attached to their own feedback (`feedback.user_id === user.id`). Accessing other students' images returns `403 Forbidden`.
  * **Bus Incharge:** May ONLY view images for their assigned bus (`record.portal === 'bus' && record.bus_number === user.bus_number`). Manipulating feedback ID to access another bus returns `403 Forbidden`.
  * **Transport Incharge:** Authorized to view all Bus Portal images; blocked from Hostel portal images (`403 Forbidden`).
  * **Hostel Warden:** May ONLY view images for their assigned floor (`record.portal === 'hostel' && record.floor === user.assigned_floor`). Accessing a different floor returns `403 Forbidden`.
  * **Faculty / HOD:** May ONLY view images for student feedback in their own department (`record.portal === 'education' && record.department === user.department`). Accessing other departments returns `403 Forbidden`.
  * **Management:** Retains institutional oversight across Education, Bus, and Hostel portals.
* **[IMPLEMENTED]** Two secure retrieval endpoints enforce this authorization:
  * `GET /api/upload/feedback/:id/image`
  * `GET /api/feedback/:id/image`

---

## 9. MANAGEMENT & REVIEWER IMAGE VIEWING

* **[FACT]** Management and Incharge/Warden/HOD feedback history views previously updated with "View Image" buttons and `ImageLightboxModal` in [ImageUpload.tsx](file:///c:/Users/Kabeesh/Downloads/AI_feedback_project-main/src/components/common/ImageUpload.tsx).
* **[IMPLEMENTED]** When `feedback.image_url` is non-null, the "View Image" button is rendered. When `image_url` is null, no image button or broken image thumbnail is displayed.
* **[IMPLEMENTED]** The modal displays the full-resolution image alongside complete feedback details (student comment, sentiment badge, status badge, scope, date, and submitter role).

---

## 10. ERROR HANDLING & TRANSACTION SAFETY

* **[IMPLEMENTED]** Error scenarios handled systematically:
  1. **No Image Attached:** Feedback submission succeeds normally (HTTP 201).
  2. **Non-Image / Prohibited Type (SVG/PDF/EXE):** Rejected with `HTTP 400 Bad Request` and descriptive error message.
  3. **Oversized File (> 5 MB):** Rejected with `HTTP 400 Bad Request` citing the 5 MB limit.
  4. **Unauthenticated Access:** Rejected with `HTTP 401 Unauthorized`.
  5. **Scope / Role Tampering:** Rejected with `HTTP 403 Forbidden`.
  6. **Firebase Upload Failure:** If atomic submission fails during storage upload, the preliminary database record is rolled back, preventing orphaned or broken image links.

---

## 11. LOCAL TEST RESULTS

### A. Dedicated Firebase & Image Security Automated Test Suite (`scratch/test_phase_a_step2_firebase.cjs`)
* **Total Tests Executed:** 49
* **Passed:** 49
* **Failed:** 0
* **Success Rate:** 100%

Key Test Verifications:
* ✅ `isConfigured()` returns false in local environment without live keys.
* ✅ 5 MB limit strictly enforced.
* ✅ Allowed MIME types (JPEG, PNG, WEBP) accepted; SVG, PDF, EXE rejected.
* ✅ Portal-aware storage path generation verified across Education, Bus, and Hostel.
* ✅ Local fallback directory upload verified with file creation on disk.
* ✅ Student self-access permitted; cross-student access blocked (403).
* ✅ Bus Incharge authorized for assigned bus (Bus 14); blocked from unassigned bus (Bus 22) (403).
* ✅ Transport Incharge authorized for Bus portal; blocked from Hostel portal (403).
* ✅ Hostel Warden authorized for assigned floor (1st Floor); blocked from unassigned floor (403).
* ✅ Faculty authorized for own department; blocked from other departments (403).
* ✅ Management authorized across Education, Bus, and Hostel portals.
* ✅ HTTP `POST /api/upload`: unauthenticated blocked (401), invalid token blocked (401).
* ✅ HTTP `POST /api/upload`: Bus student upload creates `feedback-images/bus/...` path.
* ✅ HTTP `POST /api/upload`: Hostel student upload creates `feedback-images/hostel/...` path.
* ✅ HTTP `POST /api/upload`: Education student upload creates `feedback-images/education/...` path.
* ✅ HTTP `POST /api/upload`: Oversized file (5.5 MB) rejected with HTTP 400.
* ✅ HTTP `GET /api/feedback/:id/image`: Unauthenticated blocked (401).
* ✅ HTTP `GET /api/feedback/:id/image`: Cross-bus tampering rejected with 403.
* ✅ HTTP `GET /api/feedback/:id/image`: Authorized Management returns 200 with URL.
* ✅ Database verification: Feedback Volume unchanged (3 forms), feedback count unchanged, zero binary data stored in MySQL.

### B. Frontend Production Build (`npm run build`)
* **Status:** Passed cleanly in 58.27s with code 0.
* **Output:**
  * `dist/index.html` (0.99 kB)
  * `dist/assets/index-Cuy_biAV.css` (111.60 kB)
  * `dist/assets/index-BOrX8HPh.js` (1,201.47 kB)

---

## 12. DATABASE SAFETY VERIFICATION

* **[FACT]** Aiven Production Database: **FROZEN / UNTOUCHED**.
* **[FACT]** Local Development Database: Used exclusively.
* **[FACT]** Feedback Volume Business Rule: Count of `feedback_forms` remained strictly at **3**.
* **[FACT]** Total Feedback Count: Remained at **213**; no test/demo feedback persisted.
* **[FACT]** Image Data Integrity: All image references stored as text in `feedback.image_url`. Zero binary blob data in MySQL.

---

## 13. KNOWN LIMITATIONS & FUTURE SCOPE

* **[KNOWN LIMITATION]** Live Firebase Storage bucket communication depends on production credentials (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_STORAGE_BUCKET`). Until these are provided in production, the application operates in `local_fallback` mode.
* **[FUTURE]** Issue / Action image attachments: Database schema for `issues` and `actions` does not currently contain `image_url`. Per safety rules, no schema alterations were performed during this phase. This remains reserved for future milestones.
* **[IMPLEMENTED]** Single image per feedback is currently supported via `feedback.image_url`.

---

## 14. PRODUCTION DEPLOYMENT CONSIDERATIONS

To activate live Firebase Storage in production:
1. Create a Firebase project and enable Google Cloud Storage.
2. Generate a Service Account key in Firebase Console (Project Settings → Service Accounts → Generate new private key).
3. Set the following environment variables in the production deployment host:
   ```env
   FIREBASE_PROJECT_ID=<your-project-id>
   FIREBASE_CLIENT_EMAIL=<service-account-email>
   FIREBASE_PRIVATE_KEY="<private-key-with-newlines>"
   FIREBASE_STORAGE_BUCKET=<project-id>.appspot.com
   ```
4. Restart the backend service. The application will detect configuration via `firebaseStorageService.isConfigured()` and seamlessly switch from local fallback to cloud bucket uploads without any code change.

---

# FINAL SAFETY CONFIRMATION

```text
Aiven Production Database:
FROZEN / UNTOUCHED

Local Database:
Used only for implementation/testing

Existing Education Data:
PRESERVED

Feedback Volume Rule:
UNCHANGED

Existing Portal Authorization:
PRESERVED

Image Binary Storage:
Firebase Storage

Image Reference:
MySQL

Production Firebase Credentials:
NOT COMMITTED
```

---

# PHASE A — STEP 2 STATUS

`PARTIAL — FIREBASE INTEGRATION STRUCTURE IMPLEMENTED; CREDENTIAL-DEPENDENT TESTING PENDING`
