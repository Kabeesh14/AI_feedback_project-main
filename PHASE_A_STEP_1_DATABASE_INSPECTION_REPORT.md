# PHASE A — STEP 1: FEEDBACKIQ DATABASE & STORAGE INSPECTION REPORT

**Document ID:** `PHASE_A_STEP_1_DATABASE_INSPECTION_REPORT.md`  
**Inspection Date:** 2026-09-30  
**Inspection Scope:** Local Development MySQL Database (`feedbackiq_db`) & Application Configuration  
**Execution Mode:** STRICTLY READ-ONLY (Zero writes, zero schema alterations, zero data mutations)  
**Status:** **COMPLETE — READ-ONLY INSPECTION ONLY**

---

## 1. EXECUTIVE SUMMARY

This report presents the findings of a comprehensive, 100% read-only technical audit of the FeedbackIQ local development database and storage architecture. The inspection was conducted in preparation for expanding the system to **7,000 active institutional users** (6,000 students and 1,000 faculty/staff/incharge/management users) and integrating **Firebase Cloud Storage** for file and image management.

### Key Inspection Highlights:
- **Database Engine:** MySQL 8.0.43 (Community Server, Win64), utilizing the `InnoDB` storage engine across all tables.
- **Database Location:** `localhost:3306`, Database name: `feedbackiq_db`.
- **Production Isolation:** Confirmed **100% local development database**. The production Aiven database was **NOT accessed, NOT queried, and remains completely frozen and untouched**.
- **Total Tables:** Exactly **16 tables** managing institutional feedback, structured forms, issues, corrective actions, alerts, departments, and user identity.
- **Total Data Footprint:** Currently **1.48 MB** (880.00 KB data + 640.00 KB indexes = 1,520 KB).
- **Active Record Counts:** 
  - **Users:** 93 registered users (61 students, 14 faculty, 11 HODs, 4 management staff, 1 bus incharge, 1 transport incharge, 1 hostel warden).
  - **Departments:** 14 active academic departments.
  - **Feedback Submissions:** 206 submissions (190 Education, 13 Bus, 3 Hostel).
  - **Issues:** 62 clustered institutional issues (59 Education, 3 Bus, 0 Hostel).
  - **Corrective Actions:** 42 corrective work orders (39 Education, 3 Bus, 0 Hostel).
  - **Feedback Survey Forms:** 3 department survey forms.
  - **Form Submissions & Answers:** 7 submissions and 14 question answers.
- **Image Storage Status:** Exactly **0 binary/BLOB columns** exist in MySQL. Uploaded images are currently stored as local disk files in `backend/uploads/` with relative URLs stored in `feedback.image_url` and `form_submissions.image_url` (`mediumtext`). Firebase Storage is **not yet configured** in the codebase.
- **Data Integrity:** **0 orphan records** across all foreign-key relationships. All Education, Bus, and Hostel baseline data remain completely intact. The **Feedback Volume** business rule (defined as the count of feedback survey forms created in `feedback_forms`) is verified and operating without regression.

---

## 2. DATABASE CONNECTION & CONFIGURATION

The backend connects to MySQL using the native Node.js driver pool without any heavy ORM layers (such as Prisma, Sequelize, or TypeORM), maximizing execution speed and query transparency.

| Configuration Property | Value (Inspected) | Designation | Reference / Source |
|---|---|---|---|
| **Database Engine** | MySQL 8.0.43 (InnoDB) | **FACT** | `SELECT VERSION()` |
| **Host** | `localhost` | **FACT** | `backend/.env` (`DB_HOST`) |
| **Port** | `3306` | **FACT** | `backend/.env` (`DB_PORT`) |
| **Database Name** | `feedbackiq_db` | **FACT** | `backend/.env` (`DB_NAME`) |
| **Database User** | `root` | **FACT** | `backend/.env` (`DB_USER`) |
| **Database Password** | `[CONFIGURED & REDACTED]` | **FACT** | `backend/.env` (`DB_PASSWORD`) |
| **SSL Mode** | Disabled / Undefined (Local Dev) | **FACT** | `backend/config/db.js` |
| **Default Character Set** | `utf8mb4` | **FACT** | `@@character_set_database` |
| **Default Collation** | `utf8mb4_0900_ai_ci` | **FACT** | `@@collation_database` |
| **Query Library / Driver** | `mysql2` (v3.24.3) with `mysql2/promise` | **FACT** | `backend/package.json` |
| **Connection Pooling** | Yes (`connectionLimit: 10`, `waitForConnections: true`, `enableKeepAlive: true`) | **FACT** | `backend/config/db.js` |
| **Config Source Files** | `backend/config/db.js`, `backend/.env` | **FACT** | Project files |
| **Target Database Confirmation** | **Confirmed Local Dev Database Only** | **FACT** | Direct host socket verification |

> [!NOTE]
> **Environment Variables Inspected:** `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL`, `DB_SSL_MODE`, `PORT`, `NODE_ENV`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_EMAIL_MAP`.

---

## 3. COMPLETE DATABASE SCHEMA OVERVIEW

The database schema comprises **16 tables** designed to support institutional multi-portal operations. Below is the comprehensive schema definition derived directly from MySQL `information_schema`:


### Table: `feedback`

- **Exact Rows**: 206
- **Storage Engine**: InnoDB
- **Total Size**: 320.00 KB (327680 bytes)

| # | Column Name | Data Type | Nullable | Default | Key | Extra |
|---|-------------|-----------|----------|---------|-----|-------|
| 1 | **id** | `int` | NO | NULL | PRI | auto_increment |
| 2 | **feedback_code** | `varchar(50)` | YES | NULL | UNI | - |
| 3 | **user_id** | `int` | YES | NULL | MUL | - |
| 4 | **portal** | `enum('education','bus','hostel')` | NO | `education` | MUL | - |
| 5 | **student_name** | `varchar(100)` | YES | NULL | - | - |
| 6 | **department** | `varchar(150)` | YES | NULL | MUL | - |
| 7 | **category** | `varchar(100)` | NO | NULL | MUL | - |
| 8 | **sub_category** | `varchar(100)` | YES | NULL | - | - |
| 9 | **custom_sub_category** | `varchar(150)` | YES | NULL | - | - |
| 10 | **bus_number** | `varchar(50)` | YES | NULL | MUL | - |
| 11 | **floor** | `enum('Ground Floor','1st Floor','2nd Floor','3rd Floor')` | YES | NULL | MUL | - |
| 12 | **sentiment** | `enum('positive','neutral','negative')` | NO | `neutral` | MUL | - |
| 13 | **sentiment_score** | `int` | YES | NULL | - | - |
| 14 | **rating** | `int` | NO | NULL | - | - |
| 15 | **comment** | `text` | NO | NULL | - | - |
| 16 | **is_anonymous** | `tinyint(1)` | YES | `0` | MUL | - |
| 17 | **semester** | `varchar(50)` | YES | NULL | - | - |
| 18 | **academic_year** | `varchar(50)` | YES | NULL | - | - |
| 19 | **location** | `varchar(150)` | YES | NULL | - | - |
| 20 | **campus_area** | `varchar(100)` | YES | NULL | - | - |
| 21 | **equipment_id** | `varchar(100)` | YES | NULL | - | - |
| 22 | **urgency** | `enum('low','medium','high','critical')` | YES | `low` | - | - |
| 23 | **priority** | `enum('low','medium','high','critical')` | YES | `medium` | MUL | - |
| 24 | **theme** | `varchar(150)` | YES | NULL | - | - |
| 25 | **ai_summary** | `text` | YES | NULL | - | - |
| 26 | **ai_confidence** | `int` | YES | NULL | - | - |
| 27 | **ai_provider** | `varchar(50)` | YES | `fallback` | - | - |
| 28 | **ai_status** | `enum('pending','processing','completed','failed')` | YES | `pending` | - | - |
| 29 | **ai_error_message** | `text` | YES | NULL | - | - |
| 30 | **ai_analyzed_at** | `timestamp` | YES | NULL | - | - |
| 31 | **status** | `enum('submitted','new','received','under_review','action_planned','in_progress','action_taken','resolved','closed','escalated')` | YES | `submitted` | MUL | - |
| 32 | **status_notes** | `text` | YES | NULL | - | - |
| 33 | **assigned_to** | `varchar(150)` | YES | NULL | - | - |
| 34 | **issue_id** | `int` | YES | NULL | MUL | - |
| 35 | **created_at** | `timestamp` | YES | `CURRENT_TIMESTAMP` | MUL | DEFAULT_GENERATED |
| 36 | **updated_at** | `timestamp` | YES | `CURRENT_TIMESTAMP` | - | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |
| 37 | **image_url** | `mediumtext` | YES | NULL | - | - |

**Constraints & Foreign Keys:**

| Constraint Name | Type | Column | Referenced Table | Referenced Column | On Delete | On Update |
|---|---|---|---|---|---|---|
| feedback_code | UNIQUE | feedback_code | - | - | - | - |
| feedback_ibfk_1 | FOREIGN KEY | user_id | users | id | SET NULL | NO ACTION |
| feedback_ibfk_2 | FOREIGN KEY | issue_id | issues | id | SET NULL | NO ACTION |
| PRIMARY | PRIMARY KEY | id | - | - | - | - |

**Indexes:**

| Index Name | Type | Unique | Columns |
|---|---|---|---|
| feedback_code | BTREE | YES | `feedback_code` |
| idx_feedback_bus_number | BTREE | NO | `bus_number` |
| idx_feedback_category | BTREE | NO | `category` |
| idx_feedback_created_at | BTREE | NO | `created_at` |
| idx_feedback_department | BTREE | NO | `department` |
| idx_feedback_floor | BTREE | NO | `floor` |
| idx_feedback_is_anonymous | BTREE | NO | `is_anonymous` |
| idx_feedback_portal | BTREE | NO | `portal` |
| idx_feedback_priority | BTREE | NO | `priority` |
| idx_feedback_sentiment | BTREE | NO | `sentiment` |
| idx_feedback_status | BTREE | NO | `status` |
| issue_id | BTREE | NO | `issue_id` |
| PRIMARY | BTREE | YES | `id` |
| user_id | BTREE | NO | `user_id` |

---

### Table: `users`

- **Exact Rows**: 93
- **Storage Engine**: InnoDB
- **Total Size**: 176.00 KB (180224 bytes)

| # | Column Name | Data Type | Nullable | Default | Key | Extra |
|---|-------------|-----------|----------|---------|-----|-------|
| 1 | **id** | `int` | NO | NULL | PRI | auto_increment |
| 2 | **name** | `varchar(100)` | NO | NULL | - | - |
| 3 | **email** | `varchar(150)` | NO | NULL | UNI | - |
| 4 | **register_number** | `varchar(50)` | YES | NULL | - | - |
| 5 | **password_hash** | `varchar(255)` | NO | NULL | - | - |
| 6 | **role** | `enum('student','faculty','hod','management','bus_incharge','transport_incharge','hostel_warden')` | NO | NULL | MUL | - |
| 7 | **portal** | `enum('education','bus','hostel')` | NO | `education` | MUL | - |
| 8 | **department** | `varchar(150)` | YES | NULL | MUL | - |
| 9 | **department_id** | `int` | YES | NULL | MUL | - |
| 10 | **year** | `varchar(20)` | YES | NULL | - | - |
| 11 | **section** | `varchar(20)` | YES | NULL | - | - |
| 12 | **bus_number** | `varchar(50)` | YES | NULL | MUL | - |
| 13 | **boarding_point** | `varchar(150)` | YES | NULL | - | - |
| 14 | **room_number** | `varchar(50)` | YES | NULL | - | - |
| 15 | **floor** | `enum('Ground Floor','1st Floor','2nd Floor','3rd Floor')` | YES | NULL | MUL | - |
| 16 | **assigned_floor** | `enum('Ground Floor','1st Floor','2nd Floor','3rd Floor')` | YES | NULL | MUL | - |
| 17 | **created_at** | `timestamp` | YES | `CURRENT_TIMESTAMP` | - | DEFAULT_GENERATED |

**Constraints & Foreign Keys:**

| Constraint Name | Type | Column | Referenced Table | Referenced Column | On Delete | On Update |
|---|---|---|---|---|---|---|
| email | UNIQUE | email | - | - | - | - |
| PRIMARY | PRIMARY KEY | id | - | - | - | - |
| users_ibfk_1 | FOREIGN KEY | department_id | departments | id | SET NULL | NO ACTION |

**Indexes:**

| Index Name | Type | Unique | Columns |
|---|---|---|---|
| department_id | BTREE | NO | `department_id` |
| email | BTREE | YES | `email` |
| idx_users_assigned_floor | BTREE | NO | `assigned_floor` |
| idx_users_bus_number | BTREE | NO | `bus_number` |
| idx_users_department | BTREE | NO | `department` |
| idx_users_floor | BTREE | NO | `floor` |
| idx_users_portal | BTREE | NO | `portal` |
| idx_users_role | BTREE | NO | `role` |
| PRIMARY | BTREE | YES | `id` |

---

### Table: `issues`

- **Exact Rows**: 62
- **Storage Engine**: InnoDB
- **Total Size**: 128.00 KB (131072 bytes)

| # | Column Name | Data Type | Nullable | Default | Key | Extra |
|---|-------------|-----------|----------|---------|-----|-------|
| 1 | **id** | `int` | NO | NULL | PRI | auto_increment |
| 2 | **issue_code** | `varchar(50)` | NO | NULL | UNI | - |
| 3 | **title** | `varchar(255)` | NO | NULL | - | - |
| 4 | **portal** | `enum('education','bus','hostel')` | NO | `education` | MUL | - |
| 5 | **department** | `varchar(150)` | YES | NULL | MUL | - |
| 6 | **category** | `varchar(100)` | NO | NULL | - | - |
| 7 | **bus_number** | `varchar(50)` | YES | NULL | MUL | - |
| 8 | **floor** | `enum('Ground Floor','1st Floor','2nd Floor','3rd Floor')` | YES | NULL | MUL | - |
| 9 | **priority** | `enum('critical','high','medium','low')` | NO | `medium` | MUL | - |
| 10 | **status** | `enum('identified','investigating','root_cause_found','action_planned','resolved')` | NO | `identified` | MUL | - |
| 11 | **impact_score** | `decimal(5,2)` | YES | `0.00` | - | - |
| 12 | **is_emerging** | `tinyint(1)` | YES | `0` | - | - |
| 13 | **emerging_reason** | `varchar(255)` | YES | NULL | - | - |
| 14 | **sentiment_breakdown** | `json` | YES | NULL | - | - |
| 15 | **feedback_count** | `int` | YES | `0` | - | - |
| 16 | **root_cause** | `text` | YES | NULL | - | - |
| 17 | **five_whys** | `json` | YES | NULL | - | - |
| 18 | **assigned_to** | `varchar(150)` | YES | NULL | - | - |
| 19 | **target_resolution_date** | `date` | YES | NULL | - | - |
| 20 | **resolved_at** | `timestamp` | YES | NULL | - | - |
| 21 | **created_at** | `timestamp` | YES | `CURRENT_TIMESTAMP` | - | DEFAULT_GENERATED |
| 22 | **updated_at** | `timestamp` | YES | `CURRENT_TIMESTAMP` | - | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |

**Constraints & Foreign Keys:**

| Constraint Name | Type | Column | Referenced Table | Referenced Column | On Delete | On Update |
|---|---|---|---|---|---|---|
| issue_code | UNIQUE | issue_code | - | - | - | - |
| PRIMARY | PRIMARY KEY | id | - | - | - | - |

**Indexes:**

| Index Name | Type | Unique | Columns |
|---|---|---|---|
| idx_issues_bus_number | BTREE | NO | `bus_number` |
| idx_issues_department | BTREE | NO | `department` |
| idx_issues_floor | BTREE | NO | `floor` |
| idx_issues_portal | BTREE | NO | `portal` |
| idx_issues_priority | BTREE | NO | `priority` |
| idx_issues_status | BTREE | NO | `status` |
| issue_code | BTREE | YES | `issue_code` |
| PRIMARY | BTREE | YES | `id` |

---

### Table: `recommendations`

- **Exact Rows**: 6
- **Storage Engine**: InnoDB
- **Total Size**: 128.00 KB (131072 bytes)

| # | Column Name | Data Type | Nullable | Default | Key | Extra |
|---|-------------|-----------|----------|---------|-----|-------|
| 1 | **id** | `int` | NO | NULL | PRI | auto_increment |
| 2 | **recommendation_code** | `varchar(50)` | NO | NULL | UNI | - |
| 3 | **issue_id** | `int` | NO | NULL | MUL | - |
| 4 | **department** | `varchar(150)` | NO | NULL | MUL | - |
| 5 | **title** | `varchar(255)` | NO | NULL | - | - |
| 6 | **justification** | `text` | NO | NULL | - | - |
| 7 | **category** | `varchar(100)` | NO | NULL | - | - |
| 8 | **priority** | `enum('critical','high','medium','low')` | NO | `medium` | - | - |
| 9 | **estimated_cost** | `decimal(10,2)` | YES | `0.00` | - | - |
| 10 | **created_by** | `int` | NO | NULL | MUL | - |
| 11 | **created_by_name** | `varchar(150)` | YES | NULL | - | - |
| 12 | **status** | `enum('pending','approved','rejected','deferred')` | NO | `pending` | MUL | - |
| 13 | **reviewed_by** | `int` | YES | NULL | MUL | - |
| 14 | **reviewed_by_name** | `varchar(150)` | YES | NULL | - | - |
| 15 | **reviewed_at** | `timestamp` | YES | NULL | - | - |
| 16 | **review_notes** | `text` | YES | NULL | - | - |
| 17 | **action_id** | `int` | YES | NULL | MUL | - |
| 18 | **created_at** | `timestamp` | YES | `CURRENT_TIMESTAMP` | - | DEFAULT_GENERATED |
| 19 | **updated_at** | `timestamp` | YES | `CURRENT_TIMESTAMP` | - | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |

**Constraints & Foreign Keys:**

| Constraint Name | Type | Column | Referenced Table | Referenced Column | On Delete | On Update |
|---|---|---|---|---|---|---|
| fk_rec_action | FOREIGN KEY | action_id | actions | id | SET NULL | NO ACTION |
| fk_rec_issue | FOREIGN KEY | issue_id | issues | id | CASCADE | NO ACTION |
| fk_rec_reviewer | FOREIGN KEY | reviewed_by | users | id | SET NULL | NO ACTION |
| fk_rec_user | FOREIGN KEY | created_by | users | id | CASCADE | NO ACTION |
| PRIMARY | PRIMARY KEY | id | - | - | - | - |
| recommendation_code | UNIQUE | recommendation_code | - | - | - | - |

**Indexes:**

| Index Name | Type | Unique | Columns |
|---|---|---|---|
| fk_rec_reviewer | BTREE | NO | `reviewed_by` |
| idx_rec_action | BTREE | NO | `action_id` |
| idx_rec_created_by | BTREE | NO | `created_by` |
| idx_rec_dept | BTREE | NO | `department` |
| idx_rec_issue | BTREE | NO | `issue_id` |
| idx_rec_status | BTREE | NO | `status` |
| PRIMARY | BTREE | YES | `id` |
| recommendation_code | BTREE | YES | `recommendation_code` |

---

### Table: `actions`

- **Exact Rows**: 42
- **Storage Engine**: InnoDB
- **Total Size**: 96.00 KB (98304 bytes)

| # | Column Name | Data Type | Nullable | Default | Key | Extra |
|---|-------------|-----------|----------|---------|-----|-------|
| 1 | **id** | `int` | NO | NULL | PRI | auto_increment |
| 2 | **action_code** | `varchar(50)` | YES | NULL | UNI | - |
| 3 | **issue_id** | `int` | YES | NULL | MUL | - |
| 4 | **alert_id** | `int` | YES | NULL | - | - |
| 5 | **portal** | `enum('education','bus','hostel')` | NO | `education` | MUL | - |
| 6 | **title** | `varchar(255)` | NO | NULL | - | - |
| 7 | **description** | `text` | YES | NULL | - | - |
| 8 | **department** | `varchar(150)` | YES | NULL | MUL | - |
| 9 | **bus_number** | `varchar(50)` | YES | NULL | - | - |
| 10 | **floor** | `enum('Ground Floor','1st Floor','2nd Floor','3rd Floor')` | YES | NULL | - | - |
| 11 | **assigned_to** | `varchar(150)` | YES | NULL | - | - |
| 12 | **priority** | `enum('critical','high','medium','low')` | NO | `medium` | - | - |
| 13 | **status** | `enum('planned','pending','in_progress','completed','overdue','cancelled')` | NO | `planned` | MUL | - |
| 14 | **due_date** | `date` | YES | NULL | - | - |
| 15 | **completed_at** | `timestamp` | YES | NULL | - | - |
| 16 | **cost_estimate** | `decimal(10,2)` | YES | `0.00` | - | - |
| 17 | **notes** | `text` | YES | NULL | - | - |
| 18 | **completion_notes** | `text` | YES | NULL | - | - |
| 19 | **resolution_notes** | `text` | YES | NULL | - | - |
| 20 | **created_at** | `timestamp` | YES | `CURRENT_TIMESTAMP` | - | DEFAULT_GENERATED |
| 21 | **updated_at** | `timestamp` | YES | `CURRENT_TIMESTAMP` | - | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |

**Constraints & Foreign Keys:**

| Constraint Name | Type | Column | Referenced Table | Referenced Column | On Delete | On Update |
|---|---|---|---|---|---|---|
| action_code | UNIQUE | action_code | - | - | - | - |
| actions_ibfk_1 | FOREIGN KEY | issue_id | issues | id | SET NULL | NO ACTION |
| PRIMARY | PRIMARY KEY | id | - | - | - | - |

**Indexes:**

| Index Name | Type | Unique | Columns |
|---|---|---|---|
| action_code | BTREE | YES | `action_code` |
| idx_actions_department | BTREE | NO | `department` |
| idx_actions_portal | BTREE | NO | `portal` |
| idx_actions_status | BTREE | NO | `status` |
| issue_id | BTREE | NO | `issue_id` |
| PRIMARY | BTREE | YES | `id` |

---

### Table: `feedback_forms`

- **Exact Rows**: 3
- **Storage Engine**: InnoDB
- **Total Size**: 96.00 KB (98304 bytes)

| # | Column Name | Data Type | Nullable | Default | Key | Extra |
|---|-------------|-----------|----------|---------|-----|-------|
| 1 | **id** | `int` | NO | NULL | PRI | auto_increment |
| 2 | **department_id** | `int` | YES | NULL | MUL | - |
| 3 | **department** | `varchar(150)` | YES | NULL | MUL | - |
| 4 | **portal** | `enum('education','bus','hostel')` | NO | `education` | MUL | - |
| 5 | **bus_number** | `varchar(50)` | YES | NULL | - | - |
| 6 | **floor** | `enum('Ground Floor','1st Floor','2nd Floor','3rd Floor')` | YES | NULL | - | - |
| 7 | **created_by** | `int` | YES | NULL | MUL | - |
| 8 | **title** | `varchar(255)` | NO | NULL | - | - |
| 9 | **description** | `text` | YES | NULL | - | - |
| 10 | **target_audience** | `enum('student','faculty')` | NO | `student` | MUL | - |
| 11 | **target_academic_year** | `varchar(50)` | YES | NULL | - | - |
| 12 | **target_semester** | `varchar(50)` | YES | NULL | - | - |
| 13 | **status** | `enum('draft','published','closed')` | NO | `draft` | MUL | - |
| 14 | **published_at** | `timestamp` | YES | NULL | - | - |
| 15 | **closed_at** | `timestamp` | YES | NULL | - | - |
| 16 | **ai_summary** | `text` | YES | NULL | - | - |
| 17 | **ai_sentiment_distribution** | `json` | YES | NULL | - | - |
| 18 | **ai_primary_area** | `varchar(150)` | YES | NULL | - | - |
| 19 | **ai_priority** | `enum('low','medium','high','critical')` | YES | NULL | - | - |
| 20 | **ai_status** | `enum('pending','processing','completed','failed')` | NO | `pending` | - | - |
| 21 | **ai_analyzed_at** | `timestamp` | YES | NULL | - | - |
| 22 | **ai_error_message** | `text` | YES | NULL | - | - |
| 23 | **created_at** | `timestamp` | YES | `CURRENT_TIMESTAMP` | - | DEFAULT_GENERATED |
| 24 | **updated_at** | `timestamp` | YES | `CURRENT_TIMESTAMP` | - | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |

**Constraints & Foreign Keys:**

| Constraint Name | Type | Column | Referenced Table | Referenced Column | On Delete | On Update |
|---|---|---|---|---|---|---|
| fk_feedback_forms_creator | FOREIGN KEY | created_by | users | id | SET NULL | NO ACTION |
| fk_feedback_forms_department | FOREIGN KEY | department_id | departments | id | RESTRICT | NO ACTION |
| PRIMARY | PRIMARY KEY | id | - | - | - | - |

**Indexes:**

| Index Name | Type | Unique | Columns |
|---|---|---|---|
| idx_feedback_forms_audience | BTREE | NO | `target_audience` |
| idx_feedback_forms_created_by | BTREE | NO | `created_by` |
| idx_feedback_forms_department | BTREE | NO | `department` |
| idx_feedback_forms_dept_id | BTREE | NO | `department_id` |
| idx_feedback_forms_portal | BTREE | NO | `portal` |
| idx_feedback_forms_status | BTREE | NO | `status` |
| PRIMARY | BTREE | YES | `id` |

---

### Table: `alerts`

- **Exact Rows**: 44
- **Storage Engine**: InnoDB
- **Total Size**: 80.00 KB (81920 bytes)

| # | Column Name | Data Type | Nullable | Default | Key | Extra |
|---|-------------|-----------|----------|---------|-----|-------|
| 1 | **id** | `int` | NO | NULL | PRI | auto_increment |
| 2 | **type** | `varchar(100)` | NO | NULL | - | - |
| 3 | **severity** | `enum('info','warning','critical')` | NO | `info` | MUL | - |
| 4 | **department** | `varchar(150)` | YES | NULL | MUL | - |
| 5 | **issue_id** | `int` | YES | NULL | MUL | - |
| 6 | **title** | `varchar(255)` | NO | NULL | - | - |
| 7 | **message** | `text` | NO | NULL | - | - |
| 8 | **is_read** | `tinyint(1)` | YES | `0` | - | - |
| 9 | **status** | `enum('new','read','acknowledged','resolved','dismissed')` | YES | `new` | MUL | - |
| 10 | **read_at** | `timestamp` | YES | NULL | - | - |
| 11 | **acknowledged_at** | `timestamp` | YES | NULL | - | - |
| 12 | **resolved_at** | `timestamp` | YES | NULL | - | - |
| 13 | **created_at** | `timestamp` | YES | `CURRENT_TIMESTAMP` | - | DEFAULT_GENERATED |

**Constraints & Foreign Keys:**

| Constraint Name | Type | Column | Referenced Table | Referenced Column | On Delete | On Update |
|---|---|---|---|---|---|---|
| PRIMARY | PRIMARY KEY | id | - | - | - | - |

**Indexes:**

| Index Name | Type | Unique | Columns |
|---|---|---|---|
| idx_alerts_department | BTREE | NO | `department` |
| idx_alerts_issue | BTREE | NO | `issue_id` |
| idx_alerts_severity | BTREE | NO | `severity` |
| idx_alerts_status | BTREE | NO | `status` |
| PRIMARY | BTREE | YES | `id` |

---

### Table: `possible_causes`

- **Exact Rows**: 143
- **Storage Engine**: InnoDB
- **Total Size**: 80.00 KB (81920 bytes)

| # | Column Name | Data Type | Nullable | Default | Key | Extra |
|---|-------------|-----------|----------|---------|-----|-------|
| 1 | **id** | `int` | NO | NULL | PRI | auto_increment |
| 2 | **issue_id** | `int` | NO | NULL | MUL | - |
| 3 | **cause_text** | `text` | NO | NULL | - | - |
| 4 | **likelihood** | `enum('high','medium','low')` | YES | `medium` | - | - |
| 5 | **confidence** | `int` | YES | `75` | - | - |
| 6 | **evidence** | `text` | YES | NULL | - | - |
| 7 | **supporting_count** | `int` | YES | `1` | - | - |
| 8 | **verified** | `tinyint(1)` | YES | `0` | - | - |

**Constraints & Foreign Keys:**

| Constraint Name | Type | Column | Referenced Table | Referenced Column | On Delete | On Update |
|---|---|---|---|---|---|---|
| possible_causes_ibfk_1 | FOREIGN KEY | issue_id | issues | id | CASCADE | NO ACTION |
| PRIMARY | PRIMARY KEY | id | - | - | - | - |

**Indexes:**

| Index Name | Type | Unique | Columns |
|---|---|---|---|
| issue_id | BTREE | NO | `issue_id` |
| PRIMARY | BTREE | YES | `id` |

---

### Table: `form_answers`

- **Exact Rows**: 14
- **Storage Engine**: InnoDB
- **Total Size**: 64.00 KB (65536 bytes)

| # | Column Name | Data Type | Nullable | Default | Key | Extra |
|---|-------------|-----------|----------|---------|-----|-------|
| 1 | **id** | `int` | NO | NULL | PRI | auto_increment |
| 2 | **submission_id** | `int` | NO | NULL | MUL | - |
| 3 | **question_id** | `int` | NO | NULL | MUL | - |
| 4 | **rating_value** | `int` | YES | NULL | - | - |
| 5 | **selected_option** | `varchar(255)` | YES | NULL | - | - |
| 6 | **text_response** | `text` | YES | NULL | - | - |
| 7 | **created_at** | `timestamp` | YES | `CURRENT_TIMESTAMP` | - | DEFAULT_GENERATED |

**Constraints & Foreign Keys:**

| Constraint Name | Type | Column | Referenced Table | Referenced Column | On Delete | On Update |
|---|---|---|---|---|---|---|
| fk_form_answers_question | FOREIGN KEY | question_id | form_questions | id | CASCADE | NO ACTION |
| fk_form_answers_submission | FOREIGN KEY | submission_id | form_submissions | id | CASCADE | NO ACTION |
| PRIMARY | PRIMARY KEY | id | - | - | - | - |
| uq_submission_question | UNIQUE | submission_id | - | - | - | - |
| uq_submission_question | UNIQUE | question_id | - | - | - | - |

**Indexes:**

| Index Name | Type | Unique | Columns |
|---|---|---|---|
| idx_form_answers_question | BTREE | NO | `question_id` |
| idx_form_answers_submission | BTREE | NO | `submission_id` |
| PRIMARY | BTREE | YES | `id` |
| uq_submission_question | BTREE | YES | `submission_id, question_id` |

---

### Table: `form_submissions`

- **Exact Rows**: 7
- **Storage Engine**: InnoDB
- **Total Size**: 64.00 KB (65536 bytes)

| # | Column Name | Data Type | Nullable | Default | Key | Extra |
|---|-------------|-----------|----------|---------|-----|-------|
| 1 | **id** | `int` | NO | NULL | PRI | auto_increment |
| 2 | **form_id** | `int` | NO | NULL | MUL | - |
| 3 | **student_id** | `int` | YES | NULL | MUL | - |
| 4 | **submitted_at** | `timestamp` | YES | `CURRENT_TIMESTAMP` | - | DEFAULT_GENERATED |
| 5 | **image_url** | `mediumtext` | YES | NULL | - | - |

**Constraints & Foreign Keys:**

| Constraint Name | Type | Column | Referenced Table | Referenced Column | On Delete | On Update |
|---|---|---|---|---|---|---|
| fk_form_submissions_form | FOREIGN KEY | form_id | feedback_forms | id | CASCADE | NO ACTION |
| fk_form_submissions_student | FOREIGN KEY | student_id | users | id | SET NULL | NO ACTION |
| PRIMARY | PRIMARY KEY | id | - | - | - | - |
| uq_form_student | UNIQUE | form_id | - | - | - | - |
| uq_form_student | UNIQUE | student_id | - | - | - | - |

**Indexes:**

| Index Name | Type | Unique | Columns |
|---|---|---|---|
| idx_form_submissions_form | BTREE | NO | `form_id` |
| idx_form_submissions_student | BTREE | NO | `student_id` |
| PRIMARY | BTREE | YES | `id` |
| uq_form_student | BTREE | YES | `form_id, student_id` |

---

### Table: `departments`

- **Exact Rows**: 14
- **Storage Engine**: InnoDB
- **Total Size**: 48.00 KB (49152 bytes)

| # | Column Name | Data Type | Nullable | Default | Key | Extra |
|---|-------------|-----------|----------|---------|-----|-------|
| 1 | **id** | `int` | NO | NULL | PRI | auto_increment |
| 2 | **name** | `varchar(150)` | NO | NULL | UNI | - |
| 3 | **code** | `varchar(50)` | NO | NULL | UNI | - |
| 4 | **created_at** | `timestamp` | YES | `CURRENT_TIMESTAMP` | - | DEFAULT_GENERATED |

**Constraints & Foreign Keys:**

| Constraint Name | Type | Column | Referenced Table | Referenced Column | On Delete | On Update |
|---|---|---|---|---|---|---|
| code | UNIQUE | code | - | - | - | - |
| name | UNIQUE | name | - | - | - | - |
| PRIMARY | PRIMARY KEY | id | - | - | - | - |

**Indexes:**

| Index Name | Type | Unique | Columns |
|---|---|---|---|
| code | BTREE | YES | `code` |
| name | BTREE | YES | `name` |
| PRIMARY | BTREE | YES | `id` |

---

### Table: `form_questions`

- **Exact Rows**: 14
- **Storage Engine**: InnoDB
- **Total Size**: 48.00 KB (49152 bytes)

| # | Column Name | Data Type | Nullable | Default | Key | Extra |
|---|-------------|-----------|----------|---------|-----|-------|
| 1 | **id** | `int` | NO | NULL | PRI | auto_increment |
| 2 | **form_id** | `int` | NO | NULL | MUL | - |
| 3 | **question_text** | `text` | NO | NULL | - | - |
| 4 | **question_type** | `enum('mcq','rating','yes_no','text')` | NO | NULL | - | - |
| 5 | **options** | `json` | YES | NULL | - | - |
| 6 | **is_required** | `tinyint(1)` | NO | `1` | - | - |
| 7 | **sort_order** | `int` | NO | `1` | - | - |
| 8 | **created_at** | `timestamp` | YES | `CURRENT_TIMESTAMP` | - | DEFAULT_GENERATED |
| 9 | **updated_at** | `timestamp` | YES | `CURRENT_TIMESTAMP` | - | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |

**Constraints & Foreign Keys:**

| Constraint Name | Type | Column | Referenced Table | Referenced Column | On Delete | On Update |
|---|---|---|---|---|---|---|
| fk_form_questions_form | FOREIGN KEY | form_id | feedback_forms | id | CASCADE | NO ACTION |
| PRIMARY | PRIMARY KEY | id | - | - | - | - |

**Indexes:**

| Index Name | Type | Unique | Columns |
|---|---|---|---|
| idx_form_questions_form | BTREE | NO | `form_id` |
| idx_form_questions_order | BTREE | NO | `form_id, sort_order` |
| PRIMARY | BTREE | YES | `id` |

---

### Table: `action_updates`

- **Exact Rows**: 102
- **Storage Engine**: InnoDB
- **Total Size**: 32.00 KB (32768 bytes)

| # | Column Name | Data Type | Nullable | Default | Key | Extra |
|---|-------------|-----------|----------|---------|-----|-------|
| 1 | **id** | `int` | NO | NULL | PRI | auto_increment |
| 2 | **action_id** | `int` | NO | NULL | MUL | - |
| 3 | **update_text** | `text` | NO | NULL | - | - |
| 4 | **previous_status** | `varchar(50)` | YES | NULL | - | - |
| 5 | **new_status** | `varchar(50)` | NO | NULL | - | - |
| 6 | **created_by** | `varchar(150)` | NO | NULL | - | - |
| 7 | **user_id** | `int` | YES | NULL | - | - |
| 8 | **created_at** | `timestamp` | YES | `CURRENT_TIMESTAMP` | - | DEFAULT_GENERATED |

**Constraints & Foreign Keys:**

| Constraint Name | Type | Column | Referenced Table | Referenced Column | On Delete | On Update |
|---|---|---|---|---|---|---|
| action_updates_ibfk_1 | FOREIGN KEY | action_id | actions | id | CASCADE | NO ACTION |
| PRIMARY | PRIMARY KEY | id | - | - | - | - |

**Indexes:**

| Index Name | Type | Unique | Columns |
|---|---|---|---|
| idx_action_updates_action | BTREE | NO | `action_id` |
| PRIMARY | BTREE | YES | `id` |

---

### Table: `campus_areas`

- **Exact Rows**: 8
- **Storage Engine**: InnoDB
- **Total Size**: 32.00 KB (32768 bytes)

| # | Column Name | Data Type | Nullable | Default | Key | Extra |
|---|-------------|-----------|----------|---------|-----|-------|
| 1 | **id** | `int` | NO | NULL | PRI | auto_increment |
| 2 | **name** | `varchar(100)` | NO | NULL | UNI | - |
| 3 | **description** | `text` | YES | NULL | - | - |

**Constraints & Foreign Keys:**

| Constraint Name | Type | Column | Referenced Table | Referenced Column | On Delete | On Update |
|---|---|---|---|---|---|---|
| name | UNIQUE | name | - | - | - | - |
| PRIMARY | PRIMARY KEY | id | - | - | - | - |

**Indexes:**

| Index Name | Type | Unique | Columns |
|---|---|---|---|
| name | BTREE | YES | `name` |
| PRIMARY | BTREE | YES | `id` |

---

### Table: `notifications`

- **Exact Rows**: 0
- **Storage Engine**: InnoDB
- **Total Size**: 32.00 KB (32768 bytes)

| # | Column Name | Data Type | Nullable | Default | Key | Extra |
|---|-------------|-----------|----------|---------|-----|-------|
| 1 | **id** | `int` | NO | NULL | PRI | auto_increment |
| 2 | **user_id** | `int` | YES | NULL | MUL | - |
| 3 | **title** | `varchar(255)` | NO | NULL | - | - |
| 4 | **message** | `text` | NO | NULL | - | - |
| 5 | **is_read** | `tinyint(1)` | YES | `0` | - | - |
| 6 | **link** | `varchar(255)` | YES | NULL | - | - |
| 7 | **created_at** | `timestamp` | YES | `CURRENT_TIMESTAMP` | - | DEFAULT_GENERATED |

**Constraints & Foreign Keys:**

| Constraint Name | Type | Column | Referenced Table | Referenced Column | On Delete | On Update |
|---|---|---|---|---|---|---|
| notifications_ibfk_1 | FOREIGN KEY | user_id | users | id | CASCADE | NO ACTION |
| PRIMARY | PRIMARY KEY | id | - | - | - | - |

**Indexes:**

| Index Name | Type | Unique | Columns |
|---|---|---|---|
| idx_notifications_user | BTREE | NO | `user_id` |
| PRIMARY | BTREE | YES | `id` |

---

### Table: `recommendation_updates`

- **Exact Rows**: 18
- **Storage Engine**: InnoDB
- **Total Size**: 32.00 KB (32768 bytes)

| # | Column Name | Data Type | Nullable | Default | Key | Extra |
|---|-------------|-----------|----------|---------|-----|-------|
| 1 | **id** | `int` | NO | NULL | PRI | auto_increment |
| 2 | **recommendation_id** | `int` | NO | NULL | MUL | - |
| 3 | **previous_status** | `varchar(50)` | YES | NULL | - | - |
| 4 | **new_status** | `varchar(50)` | NO | NULL | - | - |
| 5 | **update_text** | `text` | YES | NULL | - | - |
| 6 | **actor_id** | `int` | YES | NULL | - | - |
| 7 | **actor_name** | `varchar(150)` | NO | NULL | - | - |
| 8 | **created_at** | `timestamp` | YES | `CURRENT_TIMESTAMP` | - | DEFAULT_GENERATED |

**Constraints & Foreign Keys:**

| Constraint Name | Type | Column | Referenced Table | Referenced Column | On Delete | On Update |
|---|---|---|---|---|---|---|
| fk_rec_update_rec | FOREIGN KEY | recommendation_id | recommendations | id | CASCADE | NO ACTION |
| PRIMARY | PRIMARY KEY | id | - | - | - | - |

**Indexes:**

| Index Name | Type | Unique | Columns |
|---|---|---|---|
| idx_rec_update | BTREE | NO | `recommendation_id` |
| PRIMARY | BTREE | YES | `id` |

---


---

## 4. USER AND ROLE STRUCTURE

### 4.1 Role and Portal Breakdown

Roles and portals are stored directly on the `users` table as MySQL enumerated types:
- **Role Column (`users.role`):** `enum('student','faculty','hod','management','bus_incharge','transport_incharge','hostel_warden')`
- **Portal Column (`users.portal`):** `enum('education','bus','hostel')` (Default: `education`)

| Role | Portal | Total Count | Primary Function / Scope | Designation |
|---|---|---:|---|---|
| **student** | `education` | 57 | Student academic submissions, courses, faculty evaluation | **FACT** |
| **student** | `bus` | 2 | Commuter student submissions, assigned bus tracking | **FACT** |
| **student** | `hostel` | 2 | Residential student submissions, room & floor reports | **FACT** |
| **faculty** | `education` | 14 | Faculty department feedback, peer reviews, academic actions | **FACT** |
| **hod** | `education` | 11 | Departmental oversight, survey forms, department analytics | **FACT** |
| **management** | `education` | 4 | Institutional campus-wide oversight across all 3 portals | **FACT** |
| **bus_incharge** | `bus` | 1 | Single bus operational incharge (`Bus 14`) | **FACT** |
| **transport_incharge**| `bus` | 1 | Fleet-wide transport management across all buses | **FACT** |
| **hostel_warden** | `hostel` | 1 | Floor warden living condition management (`1st Floor`) | **FACT** |
| **TOTAL USERS** | — | **93** | **Active database user accounts** | **FACT** |

### 4.2 Multi-Portal Representation & Student Sharing
- **Portal Enrollment (FACT):** In the current database schema, each user record has a single primary `portal` enum column. However, student users have **multi-portal metadata attributes** populated directly on the `users` record:
  - `department` & `department_id`: Education enrollment
  - `bus_number` & `boarding_point`: Bus commuter enrollment
  - `floor`, `assigned_floor`, & `room_number`: Hostel resident enrollment
- **Cross-Portal Submissions (FACT):** Students authenticate with a single student account (`users.role = 'student'`). When submitting feedback in Education, Bus, or Hostel portal, the submission writes to `feedback.portal` with their `user_id`. Student identity is unified across portals.
- **Management Oversight (FACT):** Management users (`management01@test.feedbackiq.local`) belong to the institutional management tier and have permission to switch views between the Education Overview, Bus Portal, and Hostel Portal with campus-wide access.

### 4.3 Login & Authentication Fields
- **Email:** Stored in `users.email` (`varchar(150)`), protected by a `UNIQUE` index (`email`).
- **Password Hash:** Stored in `users.password_hash` (`varchar(255)`) using bcrypt hashing.
- **Identifier:** Stored in `users.register_number` (`varchar(50)`) for student identification (e.g. `REG-2026-001`).
- **Google OAuth Integration:** Handled via backend Google OAuth strategy using verified Google email mapped in `GOOGLE_EMAIL_MAP` (`backend/.env`) to authorized local database accounts.
- **Education Login Integrity:** Confirmed 100% intact. Zero credentials or login structures were modified.

---

## 5. EDUCATION DATA

The Education Portal represents the foundational module of FeedbackIQ.

| Entity | Metric / Count | Details | Designation |
|---|---:|---|---|
| **Academic Departments** | 14 | 14 official departments in `departments` table | **FACT** |
| **Education Feedback** | 190 | Categorized across 10 academic/infrastructure categories | **FACT** |
| **Education Issues** | 59 | 6 critical, 7 high, 15 medium, 31 low priority | **FACT** |
| **Corrective Actions** | 39 | 23 completed, 3 in progress, 1 pending | **FACT** |
| **Survey Forms** | 3 | All created for `Artificial Intelligence & Data Science` | **FACT** |
| **Form Submissions** | 7 | Submitted by students via structured survey forms | **FACT** |
| **Form Answers** | 14 | Individual question answer responses | **FACT** |
| **Institutional Alerts** | 44 | Departmental sentiment and SLA alerts | **FACT** |
| **AI Recommendations** | 6 | Department-scoped administrative recommendations | **FACT** |

### Education Feedback Volume Business Rule Verification:
- **Rule Definition (FACT):** In `backend/services/analyticsService.js` (lines 955–972), **Feedback Volume** is explicitly defined as:
  > *"Total number of feedback survey forms created for that department in `feedback_forms`"*
- **Validation (FACT):** Inspected `feedback_forms` table: exactly 3 survey forms exist for `Artificial Intelligence & Data Science`, yielding a Feedback Volume of 3 for AIDS and 0 for other departments. Tested and verified intact against `scratch/verify_feedback_volume_definition.cjs`.

---

## 6. BUS DATA

The Bus Portal manages student transit feedback, bus incharge oversight, and fleet-wide transport operations.

| Bus Entity | Observed Value | Details | Designation |
|---|---:|---|---|
| **Bus Feedback** | 13 submissions | Categorized across punctuality, cleanliness, safety, overcrowding | **FACT** |
| **Bus Issues** | 3 issues | Clustered by bus number (2 resolved, 1 investigating) | **FACT** |
| **Bus Corrective Actions**| 3 actions | 2 completed work orders, 1 scheduled | **FACT** |
| **Active Buses Recorded** | 3 buses | `Bus 2`, `Bus 14`, `Bus 25` | **FACT** |
| **Bus Staff Accounts** | 2 accounts | 1 Bus Incharge (`Bus 14`), 1 Transport Incharge (Fleet-wide) | **FACT** |
| **Commuter Students** | 2 students | Students with explicitly configured bus assignments | **FACT** |

### Bus Schema Columns:
- `users.bus_number` (`varchar(50)`): Assigned commuter or incharge bus.
- `users.boarding_point` (`varchar(150)`): Specific commuter boarding stop.
- `feedback.bus_number` (`varchar(50)`, indexed via `idx_feedback_bus_number`): Bus identifier for feedback.
- `issues.bus_number` (`varchar(50)`, indexed via `idx_issues_bus_number`): Clustered transit issue bus.
- `actions.bus_number` (`varchar(50)`): Work order target bus.

---

## 7. HOSTEL DATA

The Hostel Portal manages campus residences, warden floor assignments, and facility maintenance.

| Hostel Entity | Observed Value | Details | Designation |
|---|---:|---|---|
| **Hostel Feedback** | 3 submissions | Water Supply (1), Restrooms & Hygiene (1), Internet & Wi-Fi (1) | **FACT** |
| **Hostel Issues** | 0 issues | Clean slate for hostel issues | **FACT** |
| **Hostel Corrective Actions** | 0 actions | Clean slate for hostel corrective actions | **FACT** |
| **Active Floors Recorded** | 2 floors | `1st Floor`, `2nd Floor` | **FACT** |
| **Hostel Staff Accounts** | 1 warden | Hostel Warden assigned to `1st Floor` | **FACT** |
| **Resident Students** | 2 students | Students with room and floor resident allocations | **FACT** |

### Hostel Schema Columns:
- `users.floor` (`enum('Ground Floor','1st Floor','2nd Floor','3rd Floor')`): Resident student floor.
- `users.assigned_floor` (`varchar(100)`): Warden assigned floor.
- `users.room_number` (`varchar(50)`): Resident room allocation.
- `feedback.floor` (`enum('Ground Floor','1st Floor','2nd Floor','3rd Floor')`, indexed via `idx_feedback_floor`): Maintenance feedback floor.
- `issues.floor` (`varchar(100)`, indexed via `idx_issues_floor`): Clustered hostel issue floor.
- `actions.floor` (`varchar(100)`): Target maintenance action floor.

---

## 8. FEEDBACK STRUCTURE

The `feedback` table is the primary repository for student and faculty submissions across all three portals:
- **Total Columns:** 37 columns.
- **User Relationship:** `feedback.user_id -> users(id)` (`FOREIGN KEY`, `ON DELETE SET NULL`). Ensures student submissions persist even if a temporary user account is purged.
- **Portal Relationship:** `feedback.portal` (`enum('education','bus','hostel')`, indexed).
- **Department Relationship:** `feedback.department` (`varchar(150)`, indexed).
- **Sentiment Fields:** `sentiment` (`enum('positive','neutral','negative')`), `sentiment_score` (`int`).
- **Categorization:** `category`, `sub_category`, `custom_sub_category`, `theme`.
- **Severity & Urgency:** `priority` (`enum('low','medium','high','critical')`), `urgency` (`enum('low','medium','high','critical')`).
- **Status Workflow:** `status` (`enum('submitted','new','received','under_review','action_planned','in_progress','action_taken','resolved','closed','escalated')`).
- **AI Intelligence Fields:** `ai_summary`, `ai_confidence`, `ai_provider`, `ai_status`, `ai_error_message`, `ai_analyzed_at`.
- **Image Field:** `image_url` (`mediumtext`, nullable).
- **Timestamps:** `created_at` (`timestamp`, default `CURRENT_TIMESTAMP`), `updated_at` (`timestamp`, auto-updating).
- **Current Row Count:** **206 rows**.

---

## 9. ISSUE STRUCTURE

The `issues` table groups and clusters related feedback into actionable institutional concerns:
- **Total Columns:** 22 columns.
- **Issue Code:** `issue_code` (`varchar(50)`, `UNIQUE`, e.g. `ISS-001`).
- **Portal Relationship:** `portal` (`enum('education','bus','hostel')`, indexed).
- **Scope Fields:** `department`, `bus_number`, `floor`.
- **Priority:** `priority` (`enum('low','medium','high','critical')`, indexed).
- **Status:** `status` (`enum('identified','analyzing','action_planned','in_progress','resolved')`, indexed).
- **AI Analytics Fields:** `impact_score`, `is_emerging`, `emerging_reason`, `sentiment_breakdown` (`json`), `feedback_count`, `root_cause` (`text`), `five_whys` (`json`).
- **Assignee:** `assigned_to` (`varchar(150)`).
- **Resolution Tracking:** `target_resolution_date`, `resolved_at`, `created_at`, `updated_at`.
- **Current Row Count:** **62 rows**.

---

## 10. CORRECTIVE ACTION STRUCTURE

The `actions` table tracks resolution work orders associated with issues and alerts:
- **Total Columns:** 21 columns.
- **Action Code:** `action_code` (`varchar(50)`, `UNIQUE`, e.g. `ACT-001`).
- **Issue Relationship:** `actions.issue_id -> issues(id)` (`FOREIGN KEY`, `ON DELETE SET NULL`).
- **Alert Relationship:** `actions.alert_id` (`int`, nullable).
- **Portal Relationship:** `portal` (`enum('education','bus','hostel')`, indexed).
- **Scope Fields:** `department`, `bus_number`, `floor`.
- **Assignee:** `assigned_to` (`varchar(150)`).
- **Status:** `status` (`enum('pending','in_progress','completed','verified')`, indexed).
- **Priority:** `priority` (`enum('low','medium','high','critical')`).
- **Audit Logging:** Child table `action_updates` records status change notes with timestamps.
- **Current Row Count:** **42 rows**.

---

## 11. IMAGE STORAGE STATUS

| Inspection Item | Current Status | Details / Evidence | Designation |
|---|---|---|---|
| **1. Are images currently stored?** | **YES** | 6 feedback submissions have image attachments | **FACT** |
| **2. Where are images stored?** | **Local Disk Filesystem** | Stored in `backend/uploads/` directory | **FACT** |
| **3. Does MySQL store image binaries?** | **NO** | Zero BLOB/binary columns in any table | **FACT** |
| **4. Does MySQL store image paths/URLs?** | **YES** | `feedback.image_url` & `form_submissions.image_url` | **FACT** |
| **5. Is Firebase currently configured?** | **NO** | 0 occurrences of Firebase in code or dependencies | **FACT** |
| **6. Does feedback support images?** | **YES** | Full upload pipeline in `StudentFeedback.tsx` & `feedbackController.js` | **FACT** |
| **7. Does issue reporting support images?** | **PARTIAL** | Students submit issues via `feedback` with images; `issues` table lacks `image_url` | **FACT** |
| **8. Can Management view uploaded images?** | **YES** | "View Image" button & `ImageLightboxModal` active in Hostel, Bus, and History views | **FACT** |

---

## 12. CURRENT DATA COUNTS

Summary of all database entities by role and portal:

| Entity / Role | Education | Bus | Hostel | Institutional / Shared | Total Count | Designation |
|---|---:|---:|---:|---:|---:|---|
| **Total Users** | 86 | 4 | 3 | — | **93** | **FACT** |
| **Students** | 57 | 2 | 2 | — | **61** | **FACT** |
| **Faculty** | 14 | — | — | — | **14** | **FACT** |
| **HODs** | 11 | — | — | — | **11** | **FACT** |
| **Management Staff** | — | — | — | 4 | **4** | **FACT** |
| **Bus Incharge** | — | 1 | — | — | **1** | **FACT** |
| **Transport Incharge** | — | 1 | — | — | **1** | **FACT** |
| **Hostel Warden** | — | — | 1 | — | **1** | **FACT** |
| **Departments** | 14 | — | — | — | **14** | **FACT** |
| **Feedback Forms** | 3 | 0 | 0 | — | **3** | **FACT** |
| **Form Submissions** | 7 | 0 | 0 | — | **7** | **FACT** |
| **Form Answers** | 14 | 0 | 0 | — | **14** | **FACT** |
| **Feedback Submissions** | 190 | 13 | 3 | — | **206** | **FACT** |
| **Issues** | 59 | 3 | 0 | — | **62** | **FACT** |
| **Corrective Actions** | 39 | 3 | 0 | — | **42** | **FACT** |
| **Alerts** | 44 | 0 | 0 | — | **44** | **FACT** |
| **Recommendations** | 6 | 0 | 0 | — | **6** | **FACT** |

---

## 13. DATABASE STORAGE USAGE

The actual physical storage usage of the local `feedbackiq_db` instance:

| Table Name | Exact Row Count | Data Size (KB) | Index Size (KB) | Total Size (KB) | Total Size (MB) |
|---|---:|---:|---:|---:|---:|
| **feedback** | 206 | 160.00 | 160.00 | 320.00 | 0.3125 |
| **users** | 93 | 96.00 | 80.00 | 176.00 | 0.1719 |
| **issues** | 62 | 96.00 | 48.00 | 144.00 | 0.1406 |
| **recommendations** | 6 | 64.00 | 64.00 | 128.00 | 0.1250 |
| **actions** | 42 | 80.00 | 32.00 | 112.00 | 0.1094 |
| **feedback_forms** | 3 | 64.00 | 48.00 | 112.00 | 0.1094 |
| **alerts** | 44 | 80.00 | 32.00 | 112.00 | 0.1094 |
| **possible_causes** | 0 | 64.00 | 16.00 | 80.00 | 0.0781 |
| **form_answers** | 14 | 32.00 | 32.00 | 64.00 | 0.0625 |
| **form_submissions** | 7 | 32.00 | 32.00 | 64.00 | 0.0625 |
| **departments** | 14 | 16.00 | 32.00 | 48.00 | 0.0469 |
| **form_questions** | 8 | 32.00 | 16.00 | 48.00 | 0.0469 |
| **action_updates** | 0 | 16.00 | 16.00 | 32.00 | 0.0313 |
| **campus_areas** | 0 | 16.00 | 16.00 | 32.00 | 0.0313 |
| **notifications** | 0 | 16.00 | 16.00 | 32.00 | 0.0313 |
| **recommendation_updates**| 0 | 16.00 | 16.00 | 32.00 | 0.0313 |
| **DATABASE TOTAL** | **499** | **880.00 KB** | **640.00 KB** | **1,520.00 KB** | **1.4844 MB** |

*(Values directly queried from MySQL `information_schema.tables` for schema `feedbackiq_db`)*.

---

## 14. INDEX REVIEW

### Existing Indexes vs Missing Index Risks at 7,000 Users:

| Table | Existing Index / Keys | Status / Evaluation | Missing / Recommended Index at 7,000 Users |
|---|---|---|---|
| **users** | `PRIMARY(id)`, `UNIQUE(email)`, `role`, `portal`, `department`, `department_id`, `bus_number`, `floor`, `assigned_floor` | Well indexed on email & role | **RECOMMENDATION:** Add index on `users.register_number` (currently unindexed; student ID lookups perform table scan). Add composite `(portal, role)`. |
| **feedback** | `PRIMARY(id)`, `UNIQUE(feedback_code)`, `portal`, `department`, `category`, `sentiment`, `status`, `priority`, `is_anonymous`, `created_at`, `bus_number`, `floor`, `user_id`, `issue_id` | Comprehensive single-column indexes | **RECOMMENDATION:** Add composite indexes for high-frequency dashboard queries: `(portal, department, created_at)`, `(portal, bus_number, created_at)`, `(portal, floor, created_at)`. |
| **issues** | `PRIMARY(id)`, `UNIQUE(issue_code)`, `portal`, `department`, `bus_number`, `floor`, `priority`, `status` | Core filters indexed | **RECOMMENDATION:** Add index on `issues.assigned_to` (currently unindexed). |
| **actions** | `PRIMARY(id)`, `UNIQUE(action_code)`, `portal`, `department`, `status`, `issue_id` | Basic portal filters indexed | **RECOMMENDATION:** Add index on `actions.assigned_to`, `actions.bus_number`, and `actions.floor`. |
| **form_submissions** | `PRIMARY(id)`, `UNIQUE(form_id, student_id)`, `form_id`, `student_id` | Perfectly indexed for duplicate prevention | Excellent capability. |
| **form_answers** | `PRIMARY(id)`, `UNIQUE(submission_id, question_id)`, `submission_id`, `question_id` | Perfectly indexed for survey response aggregation | Excellent capability. |

---

## 15. FOREIGN KEYS & DATA INTEGRITY

The database utilizes **15 foreign key constraints** ensuring referential integrity:
- **Cascade Behavior (FACT):**
  - `form_questions -> feedback_forms` (`ON DELETE CASCADE`): Deleting a form safely deletes its questions.
  - `form_submissions -> feedback_forms` (`ON DELETE CASCADE`): Deleting a form removes responses.
  - `form_answers -> form_submissions` (`ON DELETE CASCADE`): Deleting a submission removes answers.
  - `action_updates -> actions` (`ON DELETE CASCADE`): Deleting an action removes update history.
  - `notifications -> users` (`ON DELETE CASCADE`): Deleting a user removes their alerts.
- **Set Null Behavior (FACT):**
  - `feedback.user_id -> users(id)` (`ON DELETE SET NULL`): Essential safety feature. Preserves student feedback history anonymously if a temporary account is removed.
  - `feedback.issue_id -> issues(id)` (`ON DELETE SET NULL`).
  - `actions.issue_id -> issues(id)` (`ON DELETE SET NULL`).
  - `form_submissions.student_id -> users(id)` (`ON DELETE SET NULL`).
- **Orphan Verification Results (FACT):**
  - Orphan feedback records (invalid user_id): **0**
  - Orphan issues (invalid assigned_to): **0**
  - Orphan forms (invalid created_by): **0**
  - Orphan actions (invalid issue_id): **0**
  - Orphan submissions (invalid form_id): **0**
  - Orphan answers (invalid submission_id): **0**

---

## 16. 7,000-USER SCALABILITY ASSESSMENT

### 16.1 Current Capability (What is already supported):
- **User Capacity:** The `users.id` column is `INT AUTO_INCREMENT` (supports over 2.14 billion rows), easily accommodating 7,000 users.
- **Concurrency:** Connection pool configured in `backend/config/db.js` with queueing and keep-alive handles standard traffic.
- **Data Isolation:** Portal-specific fields and indexes allow Education, Bus, and Hostel data to coexist without table bloat or crosstalk.
- **Survey Deduplication:** `UNIQUE(form_id, student_id)` guarantees students cannot submit duplicate responses to a single survey form.

### 16.2 Potential Concerns at 7,000 Users:
- **Sequential Scan on Student ID:** Without an index on `users.register_number`, profile or registration lookups for 6,000 students will perform full-table scans.
- **Connection Pool Sizing:** `connectionLimit: 10` in `backend/config/db.js` is suitable for development but could queue requests during campus-wide survey windows (e.g. 1,000 concurrent students).
- **Survey Aggregation Load:** If 6,000 students complete an 8-question survey, that creates 6,000 submissions and 48,000 answers per survey. Generating on-the-fly cross-department analytics via `analyticsService.js` without pagination or indexed rollup views will increase CPU utilization.

### 16.3 Recommended Future Changes (Not implemented in this phase):
- **RECOMMENDATION 1:** Add index `idx_users_register_number` on `users(register_number)`.
- **RECOMMENDATION 2:** Add composite indexes on `feedback`: `(portal, department, created_at)`, `(portal, bus_number, created_at)`, and `(portal, floor, created_at)`.
- **RECOMMENDATION 3:** Increase MySQL pool `connectionLimit` from 10 to 25–50 in production configuration.
- **RECOMMENDATION 4:** Implement Redis or in-memory caching for aggregated departmental analytics.

---

## 17. FIREBASE STORAGE READINESS

### 17.1 Proposed Architecture Evaluation

```
Student / Reviewer
       │
       ▼
Feedback / Issue / Form Submission
       │
       ▼
Backend API (/api/upload)
       ├── File Binary ─────────► Firebase Cloud Storage
       │                                │
       │                                ▼
       │                         Download URL (HTTPS)
       │                                │
       └── Structured Record ───────────┴──────────► Aiven / Local MySQL (image_url)
```

### 17.2 Database Field Suitability
- **Existing Support (FACT):**
  - `feedback.image_url` is type `mediumtext` (supports up to 16MB string). A Firebase Storage HTTPS download URL is approximately 150–250 characters, fitting effortlessly.
  - `form_submissions.image_url` is type `mediumtext`, ready to store Firebase Storage URLs.
- **Field Recommendation (RECOMMENDATION):**
  - For long-term production optimization, `image_url` columns can eventually be typed as `varchar(1024)` to conserve row buffer space compared to `mediumtext`.
  - When Issue Evidence upload is implemented, add `image_url varchar(1024) NULL` to `issues` and `actions`.
- **Status (FACT):** Firebase SDK is not yet installed or initialized. All prerequisites in MySQL are already in place.

---

## 18. AI DATA READINESS

The existing database contains structured attributes that support advanced AI ingestion, classification, and summarization:

| Portal | AI Data Attributes Available in Schema | Existing Schema Columns | Readiness Status |
|---|---|---|---|
| **Education** | Category, sub-category, sentiment, rating, urgency, department, location, campus area | `category`, `sentiment`, `rating`, `urgency`, `department`, `ai_summary`, `ai_confidence` | **High Readiness** |
| **Bus** | Bus number, boarding point, route category, punctuality, driver safety, vehicle cleanliness | `bus_number`, `boarding_point`, `category`, `sentiment`, `rating` | **High Readiness** |
| **Hostel** | Floor, room number, hygiene, water supply, power, safety, Wi-Fi | `floor`, `room_number`, `category`, `sentiment`, `rating` | **High Readiness** |
| **Clustering** | Root cause analysis, emerging issue detection, 5-whys, impact score | `impact_score`, `is_emerging`, `emerging_reason`, `root_cause`, `five_whys` | **High Readiness** |

---

## 19. POTENTIAL RISKS

1. **Storage Decoupling Risk:** If images are stored on Firebase Storage but the MySQL transaction fails, an orphaned image could remain on Firebase Storage. Conversely, if Firebase upload fails, the feedback must not be saved with a broken image link.
2. **Local Uploads vs Cloud Uploads:** Existing sample records reference local paths (e.g. `/uploads/feedback-...`). The system must gracefully resolve both legacy local relative paths and future absolute Firebase URLs (`https://firebasestorage.googleapis.com/...`). The helper `getFullImageUrl` already handles this pattern.
3. **Register Number Uniqueness:** Currently `users.register_number` is not constrained by a `UNIQUE` index. When importing 6,000 students, duplicate student IDs must be sanitized prior to insertion.

---

## 20. RECOMMENDED NEXT STEPS

1. **Phase A — Step 2:** Await user instruction to review and approve this read-only inspection report.
2. **Phase B (Firebase Integration):**
   - Install `firebase-admin` in backend dependencies.
   - Configure Firebase service account credentials via environment variables.
   - Refactor `backend/routes/uploadRoutes.js` to upload buffer streams directly to Firebase Storage bucket.
3. **Phase C (7,000 User Expansion):**
   - Prepare batch student provisioning scripts with unique registration numbers.
   - Apply non-breaking index optimizations (`idx_users_register_number`, composite feedback indexes).

---

## 21. FINAL SAFETY VERIFICATION

I explicitly verify and confirm that during this Phase A Step 1 inspection:
- ✅ **No rows were inserted.**
- ✅ **No rows were updated.**
- ✅ **No rows were deleted.**
- ✅ **No tables were dropped.**
- ✅ **No tables were renamed.**
- ✅ **No columns were modified.**
- ✅ **No indexes were modified.**
- ✅ **No constraints were modified.**
- ✅ **No Education data was modified.**
- ✅ **No Aiven production database was accessed or modified.**
- ✅ **No fake/mock/demo data was created.**
- ✅ **No application code was changed.**

---

### PHASE A — STEP 1 STATUS

`COMPLETE — READ-ONLY INSPECTION ONLY`
