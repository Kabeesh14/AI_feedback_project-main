# TEMPORARY BUS & HOSTEL STUDENT TEST ACCOUNTS REPORT

**Date:** September 28, 2026  
**Environment:** Local Staging Environment (`Kabeesh96`)  
**Active Database:** Local MySQL (`feedbackiq_db` on `localhost:3306`)  
**Production Aiven Database Status:** **CERTIFIED FROZEN & UNTOUCHED**  
**Final Status:** **TEMPORARY STUDENT TEST ACCOUNTS READY**  

---

## 1. DATABASE CONFIGURATION & ENVIRONMENT

All operations were executed strictly against the local staging database. The production Aiven Cloud database was guarded and verified to remain frozen.

| Key | Configured Target | Verification Status |
| :--- | :--- | :--- |
| **Database Host** | `localhost` (`127.0.0.1`) | Local machine socket |
| **Port** | `3306` | Local MySQL instance |
| **Database Name** | `feedbackiq_db` | Local staging database |
| **Database User** | `root` | Local administrator |
| **Aiven Production Check** | `mysql-18d905cd-feedbackiq.f.aivencloud.com` | **ZERO mutations / Zero writes** |

---

## 2. PRODUCTION AIVEN DATABASE IMMUTABILITY AUDIT

A read-only table count audit was performed against the production Aiven Cloud database (`mysql-18d905cd-feedbackiq.f.aivencloud.com:22149 / defaultdb`) before and after the local account insertions.

### Aiven Cloud Audit Matrix:

| Table Name | Certified Baseline Count | Post-Operation Count | Immutability Status |
| :--- | :---: | :---: | :---: |
| `users` | 87 | 87 | **UNTOUCHED (0 changes)** |
| `feedback_forms` | 3 | 3 | **UNTOUCHED (0 changes)** |
| `feedback` | 183 | 183 | **UNTOUCHED (0 changes)** |
| `issues` | 55 | 55 | **UNTOUCHED (0 changes)** |
| `actions` | 40 | 40 | **UNTOUCHED (0 changes)** |
| `departments` | 14 | 14 | **UNTOUCHED (0 changes)** |

```text
Aiven Production Database:
UNTOUCHED (FROZEN)
```

---

## 3. DUPLICATE CHECK RESULTS

Before inserting any records, a pre-insertion query was executed on `feedbackiq_db.users` for the two target test emails:

```sql
SELECT id, name, email, role, portal FROM users WHERE email IN ('bus.student.test@feedbackiq.com', 'hostel.student.test@feedbackiq.com');
```

- **Query Result:** `0` matching accounts found.
- **Duplicate Status:** None found. No existing accounts were overwritten.

---

## 4. TEMPORARY STUDENT ACCOUNTS CREATED

The two temporary student accounts were inserted into the local `feedbackiq_db.users` table using standard `bcrypt` hashing (10 salt rounds):

### Account 1: Bus Test Student
```text
ID: 123
Name: Bus Test Student
Email: bus.student.test@feedbackiq.com
Role: student
Portal: bus
Bus Number: Bus 14
Boarding Point: Test Boarding Point
Department: NULL
Department ID: NULL
Year: NULL
Section: NULL
Room Number: NULL
Floor: NULL
Assigned Floor: NULL
```

### Account 2: Hostel Test Student
```text
ID: 124
Name: Hostel Test Student
Email: hostel.student.test@feedbackiq.com
Role: student
Portal: hostel
Room Number: 104
Floor: 1st Floor
Bus Number: NULL
Boarding Point: NULL
Department: NULL
Department ID: NULL
Year: NULL
Section: NULL
Assigned Floor: NULL
```

---

## 5. PASSWORD SPECIFICATION & HASHING

- **Testing Password:** `FeedbackIQ@Test123!`
- **Algorithm:** `bcrypt`
- **Salt Rounds:** 10
- **Storage:** Stored in `users.password_hash` column. No plaintext passwords or credentials exposed.

---

## 6. AUTHENTICATION & SESSION RESTORATION VERIFICATION

Both accounts were validated end-to-end through the backend API endpoints:
- `POST /api/auth/login`
- `GET /api/auth/me`

| Account | Login Status | JWT Issued | Role Verified | Portal Verified | Session Restore (`/api/auth/me`) | Overall Result |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `bus.student.test@feedbackiq.com` | `200 OK` | Yes | `student` | `bus` | Restored: Bus 14, Test Boarding Point | **PASS** |
| `hostel.student.test@feedbackiq.com` | `200 OK` | Yes | `student` | `hostel` | Restored: Room 104, 1st Floor | **PASS** |

---

## 7. PORTAL-SCOPED FUNCTIONAL VERIFICATION

| Test Case | Endpoint | Tested Account | Result | Status |
| :--- | :--- | :--- | :---: | :---: |
| **Bus Feedback Retrieval** | `GET /api/bus/feedback` | Bus Student | `200 OK` | **PASS** |
| **Bus Forms Retrieval** | `GET /api/bus/forms` | Bus Student | `200 OK` | **PASS** |
| **Bus Student Own Feedback** | `GET /api/feedback/my` | Bus Student | `200 OK` | **PASS** |
| **Hostel Feedback Retrieval** | `GET /api/hostel/feedback` | Hostel Student | `200 OK` | **PASS** |
| **Hostel Forms Retrieval** | `GET /api/hostel/forms` | Hostel Student | `200 OK` | **PASS** |
| **Hostel Student Own Feedback** | `GET /api/feedback/my` | Hostel Student | `200 OK` | **PASS** |
| **Admin Issues Protection** | `GET /api/bus/issues` | Bus Student | `403 Forbidden` | **PASS** |
| **Admin Issues Protection** | `GET /api/hostel/issues` | Hostel Student | `403 Forbidden` | **PASS** |

---

## 8. CROSS-PORTAL ISOLATION & SECURITY VERIFICATION

Strict security boundaries were verified to ensure student credentials cannot access foreign portals by manipulating frontend URLs or parameters:

| Attempted Scenario | Target API / Route | Expected Result | Actual Result | Status |
| :--- | :--- | :---: | :---: | :---: |
| **Bus Student → Hostel API** | `GET /api/hostel/feedback` | `403 Forbidden` | `403 Forbidden` | **PASS** |
| **Bus Student → Education Analytics** | `GET /api/analytics/department-comparison` | `403 Forbidden` | `403 Forbidden` | **PASS** |
| **Hostel Student → Bus API** | `GET /api/bus/feedback` | `403 Forbidden` | `403 Forbidden` | **PASS** |
| **Hostel Student → Education Analytics** | `GET /api/analytics/department-comparison` | `403 Forbidden` | `403 Forbidden` | **PASS** |
| **Bus Student → Education Login** | `POST /api/auth/login` (`portal: education`) | `403 Forbidden` | `403 Forbidden` | **PASS** |
| **Hostel Student → Bus Login** | `POST /api/auth/login` (`portal: bus`) | `403 Forbidden` | `403 Forbidden` | **PASS** |

---

## 9. EXISTING EDUCATION STUDENT REGRESSION

The baseline institutional Education student account was verified to ensure zero regression in the existing Academic workflow:

- **Account Tested:** `student01@test.feedbackiq.local` (Password: `password123`)
- **Login Status:** `200 OK`
- **Role & Portal:** `role = 'student'`, `portal = 'education'`
- **Department:** `Artificial Intelligence & Data Science` intact.
- **Isolation Checks:**
  - `GET /api/bus/feedback` with Education Student token: **`403 Forbidden`**
  - `GET /api/hostel/feedback` with Education Student token: **`403 Forbidden`**

---

## 10. FRONTEND UI & DASHBOARD ROUTING

Both accounts were verified against the frontend routing system:

1. **Bus Student (`bus.student.test@feedbackiq.com`):**
   - Direct Login Route: `/login?portal=bus&role=student`
   - Redirect Route: `/bus/dashboard`
   - UI Context Display:
     - Header: `Student Bus Feedback`
     - Assigned Bus: `Bus 14`
     - Boarding Point: `Test Boarding Point` (with MapPin indicator)
     - Nav Links: Dashboard, Feedback, Issues, Actions, Notifications, Profile

2. **Hostel Student (`hostel.student.test@feedbackiq.com`):**
   - Direct Login Route: `/login?portal=hostel&role=student`
   - Redirect Route: `/hostel/dashboard`
   - UI Context Display:
     - Header: `Student Hostel Feedback`
     - Assigned Floor: `1st Floor`
     - Room Number: `Room: 104` (with Home icon)
     - Nav Links: Dashboard, Feedback, Maintenance Issues, Actions, Notifications, Profile

---

## 11. SUMMARY OF TEST ACCOUNTS FOR LOCAL TESTING

```text
BUS STUDENT
Email: bus.student.test@feedbackiq.com
Password: FeedbackIQ@Test123!
Role: student
Portal: bus
Bus: Bus 14
Boarding Point: Test Boarding Point
```

```text
HOSTEL STUDENT
Email: hostel.student.test@feedbackiq.com
Password: FeedbackIQ@Test123!
Role: student
Portal: hostel
Room: 104
Floor: 1st Floor
```

---

## 12. FINAL STATUS

```text
TEMPORARY STUDENT TEST ACCOUNTS READY
```
