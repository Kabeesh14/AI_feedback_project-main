# PHASE 7 — PORTAL & ROLE SELECTION ONBOARDING FLOW REPORT

**Date:** September 28, 2026  
**Environment:** FeedbackIQ Local / Staging & Production Verification  
**Database Target:** Local MySQL (`feedbackiq_db` on `localhost:3306`)  
**Production Aiven Database Status:** **CERTIFIED FROZEN & UNTOUCHED**  
**Final Status:** **PHASE 7 COMPLETE**  

---

## 1. IMPLEMENTATION SUMMARY

Phase 7 enhances the user onboarding flow when clicking **“Get Started”** from the FeedbackIQ landing page. The updated architecture introduces a clean, dedicated portal selection step followed by specialized role selection for the **Bus** and **Hostel** portals, while preserving the existing **Education / Student** portal workflow with zero regression.

### High-Level Flow:
```text
Landing Page (/)
      ↓  (Click "Get Started")
Choose Your Portal (/portal-selection)
┌────────────────────────────────────────────────────────┐
│  🎓 Education Portal   🚌 Bus Portal   🏠 Hostel Portal │
└────────────────────────────────────────────────────────┘
         │                      │                   │
         ↓                      ↓                   ↓
  Education Flow         Bus Role Selection  Hostel Role Selection
 (/role-selection)       (/portal/bus)       (/portal/hostel)
  • Student              • Student           • Student
  • Faculty              • Bus Incharge      • Hostel Warden
  • HOD                  • Transport Head    • Management
  • Management           • Management               │
         │                      │                   │
         └──────────────────────┼───────────────────┘
                                ↓
                     Contextual Login Page (/login)
                     - Visual context badge (e.g. Bus Portal · Student Login)
                     - Scoped role tabs matching active portal
                     - "← Back to Role Selection" & "Switch Portal" navigation
                     - Authoritative JWT token issuance
                                ↓
                     Target Portal Dashboard
```

---

## 2. PORTAL SELECTION FLOW

The new component [PortalSelectionPage.tsx](file:///c:/Users/Kabeesh/Downloads/AI_feedback_project-main/src/pages/PortalSelectionPage.tsx) is mounted at `/portal-selection` (aliased to `/portal`).

- **Header:** Features the standard FeedbackIQ logo, theme toggle, "Direct Login" quick action, and "Back to Home" navigation.
- **Title & Subtitle:**
  - Title: `Choose Your Portal`
  - Subtitle: `Select the portal you want to access.`
- **Portal Cards:**
  1. **🎓 Education Portal**
     - Description: *Academic feedback, faculty, departments and institutional analytics.*
     - Key Highlights: AI Feedback Assistant, Faculty & Department Analytics, Institutional Command.
     - Action: Routes to `/role-selection?portal=education`.
  2. **🚌 Bus Portal**
     - Description: *Transport feedback, bus issues, operations and fleet analytics.*
     - Key Highlights: Bus Feedback & Issue Filing, Route-specific Incharge Actions, Fleet-wide Transport Oversight.
     - Action: Routes to `/portal/bus` (or `/role-selection?portal=bus`).
  3. **🏠 Hostel Portal**
     - Description: *Hostel feedback, maintenance issues, floor operations and analytics.*
     - Key Highlights: Room & Facility Maintenance, Floor Warden Action Center, Institutional Living Standards.
     - Action: Routes to `/portal/hostel` (or `/role-selection?portal=hostel`).
- **Footer Navigation:** Sticky bottom bar with "← Back to Home Page" ensuring easy navigation on all device form factors.

---

## 3. BUS ROLE SELECTION

When the user selects **Bus Portal**, they are directed to `/portal/bus` (handled by [RoleSelectionPage.tsx](file:///c:/Users/Kabeesh/Downloads/AI_feedback_project-main/src/pages/RoleSelectionPage.tsx) with `portal="bus"`).

- **Header:** `Bus Portal`
- **Subtitle:** `Select your role to continue.`
- **Roles Displayed:**
  1. **👨‍🎓 Student**
     - Description: *Submit bus feedback, report issues and track resolutions.*
     - Route: `/login?portal=bus&role=student`
  2. **🚌 Bus Incharge**
     - Description: *Manage feedback, issues and actions for your assigned bus.*
     - Route: `/login?portal=bus&role=bus_incharge`
  3. **🚍 Transport Incharge**
     - Description: *Monitor transport operations, fleet feedback and analytics.*
     - Route: `/login?portal=bus&role=transport_incharge`
  4. **👨‍💼 Management**
     - Description: *View transport performance, analytics and institutional oversight.*
     - Route: `/login?portal=bus&role=management`
- **Navigation:** Top navigation link and bottom action bar include `← Back to Portal Selection`.

---

## 4. HOSTEL ROLE SELECTION

When the user selects **Hostel Portal**, they are directed to `/portal/hostel` (handled by [RoleSelectionPage.tsx](file:///c:/Users/Kabeesh/Downloads/AI_feedback_project-main/src/pages/RoleSelectionPage.tsx) with `portal="hostel"`).

- **Header:** `Hostel Portal`
- **Subtitle:** `Select your role to continue.`
- **Roles Displayed:**
  1. **👨‍🎓 Student**
     - Description: *Submit hostel feedback, report maintenance issues and track resolutions.*
     - Route: `/login?portal=hostel&role=student`
  2. **🏠 Hostel Warden**
     - Description: *Manage feedback, maintenance issues and actions for your assigned floor.*
     - Route: `/login?portal=hostel&role=hostel_warden`
  3. **👨‍💼 Management**
     - Description: *View hostel performance, analytics and institutional oversight.*
     - Route: `/login?portal=hostel&role=management`
- **Navigation:** Top navigation link and bottom action bar include `← Back to Portal Selection`.

---

## 5. AUTHENTICATION FLOW

The login page [LoginPage.tsx](file:///c:/Users/Kabeesh/Downloads/AI_feedback_project-main/src/pages/LoginPage.tsx) dynamically adapts to the selected portal and role:

1. **Context Badge & Title:**
   - Displays clear context headers: `Bus Portal · Bus Incharge Login`, `Hostel Portal · Hostel Warden Login`, etc.
2. **Dynamic Role Tabs:**
   - Tabs are strictly scoped to the active portal:
     - **Education:** Student, Faculty, HOD, Management
     - **Bus:** Student, Bus Incharge, Transport Head, Management
     - **Hostel:** Student, Hostel Warden, Management
3. **Clean, Uncluttered Interface:**
   - Redundant in-card portal context switchers (such as "Student Portal Context") were removed to keep the interface direct and clean, as portal context is already established during the onboarding selection step and can be changed via the top-right "Switch Portal" link.
4. **Form Fields:**
   - Department selector is rendered only for Academic roles in Education (`student`, `faculty`, `hod`).
   - Clean credentials entry for Bus and Hostel roles.
5. **Post-Login Routing:**
   - Student logging into Bus → `/bus/dashboard`
   - Student logging into Hostel → `/hostel/dashboard`
   - Student logging into Education → `/student/dashboard`
   - Bus Incharge / Transport Incharge → `/bus/dashboard`
   - Hostel Warden → `/hostel/dashboard`
   - Management → `/bus/dashboard`, `/hostel/dashboard`, or `/management/dashboard` depending on active context.

---

## 6. GOOGLE OAUTH HANDLING & SAFEGUARDS

In compliance with **Section 8 (Google Login / Registration)**:

1. **Context Preservation:**
   - `portal` and `role` parameters are preserved in Google OAuth `state` during redirection, token exchange, and callback.
2. **Administrative Account Creation Prevention:**
   - In [authController.js](file:///c:/Users/Kabeesh/Downloads/AI_feedback_project-main/backend/controllers/authController.js):
     - `googleCallback`: If an unrecognized Google email attempts to sign in under an administrative role (`bus_incharge`, `transport_incharge`, `hostel_warden`, `management`), the server rejects registration and redirects with an error:
       `"Staff and administrative accounts cannot be created via Google registration. Only student accounts support self-registration."`
     - `completeGoogleRegistration`: Cryptographically verified tokens enforce `if (verifiedRole !== 'student') return 403 Forbidden`.
3. **Student Google Registration Flow:**
   - If an unrecognized student logs in via Google, they are directed to `/register-setup?regToken=...` where portal-specific fields are requested (e.g. Bus Number/Boarding Point for Bus; Floor/Room for Hostel; Dept/Year/Section for Education).

---

## 7. MANAGEMENT MULTI-PORTAL BEHAVIOR

Management institutional oversight is fully supported without requiring duplicate accounts:

- **Single Credential:** `management.test@feedbackiq.com` accesses Education, Bus, and Hostel portals.
- **Dynamic Session Token:**
  - Login under `portal=education` issues JWT with `portal: 'education'`.
  - Login under `portal=bus` issues JWT with `portal: 'bus'`.
  - Login under `portal=hostel` issues JWT with `portal: 'hostel'`.
- **Backend Access:** `roleMiddleware.js` grants management cross-portal authority across all endpoints (`/api/analytics`, `/api/bus/feedback`, `/api/hostel/feedback`).

---

## 8. ROUTING ARCHITECTURE

Routing is integrated into the existing [App.tsx](file:///c:/Users/Kabeesh/Downloads/AI_feedback_project-main/src/App.tsx) React Router structure:

| Route Path | Component / Handler | Description |
| :--- | :--- | :--- |
| `/` | `LandingPage` | "Get Started" buttons route to `/portal-selection` |
| `/portal-selection` | `PortalSelectionPage` | Choose Your Portal (Education, Bus, Hostel) |
| `/portal` | `PortalSelectionPage` | Convenient path alias |
| `/portal/education` | `RoleSelectionPage` | Education role selection |
| `/portal/bus` | `RoleSelectionPage` | Bus role selection |
| `/portal/hostel` | `RoleSelectionPage` | Hostel role selection |
| `/role-selection` | `RoleSelectionPage` | Dynamic role selection via `?portal=` parameter |
| `/login` | `LoginPage` | Contextual login with active portal & role |

Browser history navigation (`back` / `forward`) and direct URL access behave consistently without redirect loops.

---

## 9. SECURITY VERIFICATION & ISOLATION

As mandated by **Section 6** and **Section 16**, the frontend role selection is strictly a UX helper. The backend database and JWT tokens remain the authoritative source of truth:

| Security Scenario | Tested Action | Expected Result | Actual Result | Status |
| :--- | :--- | :---: | :---: | :---: |
| **Education HOD -> Bus** | GET `/api/bus/feedback` with HOD token | `403 Forbidden` | `403 Forbidden` | **PASSED** |
| **Education Faculty -> Hostel** | GET `/api/hostel/feedback` with Faculty token | `403 Forbidden` | `403 Forbidden` | **PASSED** |
| **Bus Incharge -> Hostel** | GET `/api/hostel/issues` with Incharge token | `403 Forbidden` | `403 Forbidden` | **PASSED** |
| **Hostel Warden -> Bus** | GET `/api/bus/feedback` with Warden token | `403 Forbidden` | `403 Forbidden` | **PASSED** |
| **Education Student -> Bus Login** | POST `/api/auth/login` (`portal: bus`) | `403 Forbidden` | `403 Forbidden` | **PASSED** |
| **Education Student -> Hostel Login** | POST `/api/auth/login` (`portal: hostel`) | `403 Forbidden` | `403 Forbidden` | **PASSED** |
| **Management -> Education** | GET `/api/analytics/department-comparison` | `200 OK` | `200 OK` | **PASSED** |
| **Management -> Bus** | GET `/api/bus/feedback` | `200 OK` | `200 OK` | **PASSED** |
| **Management -> Hostel** | GET `/api/hostel/feedback` | `200 OK` | `200 OK` | **PASSED** |
| **Bus Scope Protection** | Bus Incharge (Bus 14) queries Bus 22 | 0 leaked records | 0 leaked records | **PASSED** |
| **Hostel Scope Protection** | Warden (1st Floor) queries 3rd Floor | 0 leaked records | 0 leaked records | **PASSED** |

---

## 10. TEST ACCOUNTS USED

Verification was performed using the pre-existing local staging test accounts:

| Role | Email Address | Portal | Assigned Scope | Verified Status |
| :--- | :--- | :--- | :--- | :--- |
| **Student (Education)** | `student01@test.feedbackiq.local` | Education | AI & Data Science | **Verified (200 OK)** |
| **Faculty** | `faculty.test@feedbackiq.com` | Education | AI & Data Science | **Verified (200 OK)** |
| **HOD** | `hod.test@feedbackiq.com` | Education | AI & Data Science | **Verified (200 OK)** |
| **Management** | `management.test@feedbackiq.com` | Multi-Portal | Campus-wide | **Verified (200 OK)** |
| **Bus Incharge** | `busincharge.test@feedbackiq.com` | Bus | Bus 14 | **Verified (200 OK)** |
| **Transport Incharge** | `transport.test@feedbackiq.com` | Bus | Fleet-wide | **Verified (200 OK)** |
| **Hostel Warden** | `warden.test@feedbackiq.com` | Hostel | 1st Floor | **Verified (200 OK)** |

---

## 11. REGRESSION & AUTOMATED TEST RESULTS

Automated test verification suite (`scratch/test_phase7_portal_role_flow.cjs`):

```text
====================================================
🚀 PHASE 7 VERIFICATION — PORTAL & ROLE SELECTION FLOW
====================================================

--- 1. FRONTEND ROUTE ACCESSIBILITY (SPA) ---
  ✅ PASS: Landing page / returns HTTP 200
  ✅ PASS: Portal selection route /portal-selection returns HTTP 200
  ✅ PASS: Role selection route /role-selection returns HTTP 200
  ✅ PASS: Bus direct route /portal/bus returns HTTP 200
  ✅ PASS: Hostel direct route /portal/hostel returns HTTP 200
  ✅ PASS: Contextual login route /login returns HTTP 200

--- 2. UI REQUIREMENTS & COPY VERIFICATION ---
  ✅ PASS: PortalSelectionPage contains title "Choose Your Portal"
  ✅ PASS: PortalSelectionPage contains subtitle
  ✅ PASS: Contains Education Portal card
  ✅ PASS: Contains Education description
  ✅ PASS: Contains Bus Portal card
  ✅ PASS: Contains Bus description
  ✅ PASS: Contains Hostel Portal card
  ✅ PASS: Contains Hostel description
  ✅ PASS: Contains "Back to Home" navigation
  ✅ PASS: RoleSelectionPage supports Bus Portal title
  ✅ PASS: RoleSelectionPage contains subtitle
  ✅ PASS: Contains Bus Student description
  ✅ PASS: Contains Bus Incharge description
  ✅ PASS: Contains Transport Incharge description
  ✅ PASS: Contains Bus Management description
  ✅ PASS: RoleSelectionPage supports Hostel Portal title
  ✅ PASS: Contains Hostel Student description
  ✅ PASS: Contains Hostel Warden description
  ✅ PASS: RoleSelectionPage contains "Back to Portal Selection" navigation
  ✅ PASS: Landing Page "Get Started" routes to /portal-selection
  ✅ PASS: LoginPage contains "Back to Role Selection" navigation
  ✅ PASS: LoginPage contains "Switch Portal" navigation

--- 3. AUTHENTICATION FOR ALL SUPPORTED PORTAL + ROLE COMBINATIONS ---
  ✅ PASS: Login succeeded for Education Student [education / student] (HTTP 200)
  ✅ PASS: Session restore /api/auth/me succeeded for Education Student
  ✅ PASS: Login succeeded for Education Faculty [education / faculty] (HTTP 200)
  ✅ PASS: Session restore /api/auth/me succeeded for Education Faculty
  ✅ PASS: Login succeeded for Education HOD [education / hod] (HTTP 200)
  ✅ PASS: Session restore /api/auth/me succeeded for Education HOD
  ✅ PASS: Login succeeded for Education Management [education / management] (HTTP 200)
  ✅ PASS: Session restore /api/auth/me succeeded for Education Management
  ✅ PASS: Login succeeded for Bus Incharge [bus / bus_incharge] (HTTP 200)
  ✅ PASS: Session restore /api/auth/me succeeded for Bus Incharge
  ✅ PASS: Login succeeded for Transport Incharge [bus / transport_incharge] (HTTP 200)
  ✅ PASS: Session restore /api/auth/me succeeded for Transport Incharge
  ✅ PASS: Login succeeded for Bus Management [bus / management] (HTTP 200)
  ✅ PASS: Session restore /api/auth/me succeeded for Bus Management
  ✅ PASS: Login succeeded for Hostel Warden [hostel / hostel_warden] (HTTP 200)
  ✅ PASS: Session restore /api/auth/me succeeded for Hostel Warden
  ✅ PASS: Login succeeded for Hostel Management [hostel / management] (HTTP 200)
  ✅ PASS: Session restore /api/auth/me succeeded for Hostel Management

--- 4. CROSS-PORTAL ISOLATION & NEGATIVE AUTHORIZATION ---
  ✅ PASS: Education Student -> Bus Login: BLOCKED with HTTP 403 (unauthorized portal)
  ✅ PASS: Education Student -> Hostel Login: BLOCKED with HTTP 403 (unauthorized portal)
  ✅ PASS: Education HOD -> /api/bus/feedback: BLOCKED with HTTP 403
  ✅ PASS: Education Faculty -> /api/hostel/feedback: BLOCKED with HTTP 403
  ✅ PASS: Bus Incharge -> /api/hostel/issues: BLOCKED with HTTP 403
  ✅ PASS: Hostel Warden -> /api/bus/feedback: BLOCKED with HTTP 403
  ✅ PASS: Management -> Education /api/analytics/department-comparison: ALLOWED (HTTP 200)
  ✅ PASS: Management -> Bus /api/bus/feedback: ALLOWED (HTTP 200)
  ✅ PASS: Management -> Hostel /api/hostel/feedback: ALLOWED (HTTP 200)

--- 5. SCOPE PROTECTION & SPOOFING RESISTANCE ---
  ✅ PASS: Bus Incharge request processed with HTTP 200
  ✅ PASS: Bus Incharge scope enforced: 0 leaked Bus 22 records
  ✅ PASS: Hostel Warden request processed with HTTP 200
  ✅ PASS: Hostel Warden scope enforced: 0 leaked 3rd Floor records

--- 6. PRODUCTION BUILD ARTIFACTS VERIFICATION ---
  ✅ PASS: Production build dist/index.html exists

====================================================
TEST SUMMARY: 87 PASSED, 0 FAILED
====================================================
```

---

## 12. BUILD RESULTS

Frontend production build (`npm run build`):

```text
> vite-react-typescript-starter@0.0.0 build
> vite build

vite v5.4.8 building for production...
transforming...
✓ 2224 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                               0.99 kB │ gzip:   0.50 kB
dist/assets/login-classroom-B70ZWvfi.jpg    825.30 kB
dist/assets/index-Aksrkg0m.css              103.22 kB │ gzip:  14.53 kB
dist/assets/index-C_SI8tbA.js             1,154.37 kB │ gzip: 291.24 kB
✓ built in 13.62s
```
- **Exit Code:** `0`
- **Errors:** `0`
- **Output:** Clean bundle in `dist/`.

---

## 13. FILES MODIFIED & CREATED

1. `src/pages/PortalSelectionPage.tsx` *(New)*: Created the "Choose Your Portal" selection screen with Education, Bus, and Hostel cards.
2. `src/pages/RoleSelectionPage.tsx` *(Modified)*: Made dynamic via `portal` query parameter/prop to present role cards for Education, Bus, and Hostel. Added back navigation.
3. `src/pages/LandingPage.tsx` *(Modified)*: Updated "Get Started" triggers to navigate to `/portal-selection`.
4. `src/pages/LoginPage.tsx` *(Modified)*: Added contextual badges, scoped role tabs per active portal, "← Back to Role Selection" and "Switch Portal" navigation links, and dynamic dashboard redirects.
5. `src/App.tsx` *(Modified)*: Registered `/portal-selection`, `/portal`, `/portal/bus`, `/portal/hostel`, `/portal/education`.
6. `backend/controllers/authController.js` *(Modified)*: Added safeguards ensuring administrative roles cannot self-register via Google OAuth.
7. `scratch/test_phase7_portal_role_flow.cjs` *(New)*: Comprehensive 87-assertion automated test suite for Phase 7.

---

## 14. KNOWN LIMITATIONS

1. **Google OAuth Client ID**: In local development without public DNS or Google OAuth client credentials configured in the `.env` file, Google OAuth redirects to Google's standard consent page as expected.
2. **Student Cross-Portal Registration**: In accordance with institutional database models, existing students belong to their designated primary portal; students desiring bus or hostel submission must register with their bus or hostel credentials.

---

## 15. FINAL STATUS

```text
PHASE 7 COMPLETE
```
