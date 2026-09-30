-- ====================================================================
-- INSTITUTIONAL FEEDBACK THEME & ROOT-CAUSE ANALYTICS PLATFORM (FEEDBACKIQ)
-- Migration: Phase 1 - Feedback Forms, Questions, Submissions & Answers
-- File: backend/database/migrations/phase1_forms_schema.sql
-- ====================================================================

-- --------------------------------------------------------------------
-- DEPARTMENT ARCHITECTURE DESIGN DECISION
-- --------------------------------------------------------------------
-- In the FeedbackIQ architecture, the 9 official departments are defined
-- in the `departments(id, name, code)` reference table where `name` is UNIQUE.
-- Across the application (analyticsService, actionService, issues, actions,
-- feedback, alerts, and JWT user claims), department filtering is consistently
-- executed using the canonical department name string.
--
-- For `feedback_forms`:
-- 1. `department_id` (INT NOT NULL) is established as the authoritative
--    relational foreign key referencing `departments(id)` ON DELETE RESTRICT
--    to guarantee strict database-level referential integrity.
-- 2. `department` (VARCHAR(150) NOT NULL) is stored alongside as an immutable
--    canonical name snapshot. This guarantees high-performance query compatibility
--    with existing analytics functions (e.g. buildDeptClause) without requiring
--    repetitive JOINs on every aggregate query.
--
-- For `form_submissions`:
-- Submissions strictly reference `form_id` and `student_id`. No redundant
-- department column is stored, as department ownership is cleanly resolved
-- through `feedback_forms.department_id`.
-- --------------------------------------------------------------------

-- --------------------------------------------------------------------
-- 1. Table: feedback_forms
-- Represents an HOD-created feedback survey scoped to their department.
-- Supports draft/published/closed lifecycle, descriptive academic metadata,
-- and a collective AI analysis cache for aggregate findings.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS feedback_forms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  department_id INT NOT NULL,
  department VARCHAR(150) NOT NULL,
  created_by INT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  target_audience ENUM('student', 'faculty') NOT NULL DEFAULT 'student',
  target_academic_year VARCHAR(50) NULL COMMENT 'Descriptive metadata only in Phase 1',
  target_semester VARCHAR(50) NULL COMMENT 'Descriptive metadata only in Phase 1',
  status ENUM('draft', 'published', 'closed') NOT NULL DEFAULT 'draft',
  published_at TIMESTAMP NULL DEFAULT NULL,
  closed_at TIMESTAMP NULL DEFAULT NULL,
  
  -- Collective Form-Level AI Analysis Cache (Phase 6 Integration)
  ai_summary TEXT NULL,
  ai_sentiment_distribution JSON DEFAULT NULL,
  ai_primary_area VARCHAR(150) DEFAULT NULL,
  ai_priority ENUM('low', 'medium', 'high', 'critical') DEFAULT NULL,
  ai_status ENUM('pending', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'pending',
  ai_analyzed_at TIMESTAMP NULL DEFAULT NULL,
  ai_error_message TEXT DEFAULT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_feedback_forms_dept_id (department_id),
  INDEX idx_feedback_forms_department (department),
  INDEX idx_feedback_forms_status (status),
  INDEX idx_feedback_forms_created_by (created_by),
  CONSTRAINT fk_feedback_forms_department FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE RESTRICT,
  CONSTRAINT fk_feedback_forms_creator FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 2. Table: form_questions
-- Stores questions belonging to a feedback form.
-- Supported question types: 'mcq', 'rating', 'yes_no', 'text'.
-- MCQ options are stored in structured JSON.
-- Deterministic presentation ordering is guaranteed via `sort_order`.
-- Questions have no independent existence outside a form, hence ON DELETE CASCADE.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS form_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  form_id INT NOT NULL,
  question_text TEXT NOT NULL,
  question_type ENUM('mcq', 'rating', 'yes_no', 'text') NOT NULL,
  options JSON DEFAULT NULL,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_form_questions_form (form_id),
  INDEX idx_form_questions_order (form_id, sort_order),
  CONSTRAINT fk_form_questions_form FOREIGN KEY (form_id) REFERENCES feedback_forms (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 3. Table: form_submissions
-- Submission envelope representing a student completing a feedback form.
-- Physical database guarantee: UNIQUE(form_id, student_id) guarantees
-- that a student can submit a particular feedback form exactly ONCE.
-- Non-destructive deletion: If a student account is removed, the submission
-- envelope is preserved (student_id SET NULL) for institutional data integrity.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS form_submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  form_id INT NOT NULL,
  student_id INT NULL,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_form_student (form_id, student_id),
  INDEX idx_form_submissions_form (form_id),
  INDEX idx_form_submissions_student (student_id),
  CONSTRAINT fk_form_submissions_form FOREIGN KEY (form_id) REFERENCES feedback_forms (id) ON DELETE CASCADE,
  CONSTRAINT fk_form_submissions_student FOREIGN KEY (student_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 4. Table: form_answers
-- Stores answers to specific questions within a submission envelope.
-- Supports 1-5 numerical ratings with database-level CHECK constraint.
-- Unique constraint UNIQUE(submission_id, question_id) prevents duplicate
-- answers to the same question within a submission.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS form_answers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  submission_id INT NOT NULL,
  question_id INT NOT NULL,
  rating_value INT NULL,
  selected_option VARCHAR(255) DEFAULT NULL,
  text_response TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_submission_question (submission_id, question_id),
  CONSTRAINT chk_form_answers_rating CHECK (rating_value IS NULL OR (rating_value >= 1 AND rating_value <= 5)),
  INDEX idx_form_answers_submission (submission_id),
  INDEX idx_form_answers_question (question_id),
  CONSTRAINT fk_form_answers_submission FOREIGN KEY (submission_id) REFERENCES form_submissions (id) ON DELETE CASCADE,
  CONSTRAINT fk_form_answers_question FOREIGN KEY (question_id) REFERENCES form_questions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
