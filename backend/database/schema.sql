-- ====================================================================
-- INSTITUTIONAL FEEDBACK THEME & ROOT-CAUSE ANALYTICS PLATFORM (FEEDBACKIQ)
-- MySQL Database Schema
-- ====================================================================

CREATE DATABASE IF NOT EXISTS feedbackiq_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE feedbackiq_db;

-- 1. Departments Table (The 9 Official Departments)
CREATE TABLE IF NOT EXISTS departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE,
  code VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('student', 'faculty', 'hod', 'management') NOT NULL,
  department VARCHAR(150) NULL,
  department_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_role (role),
  INDEX idx_users_department (department),
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Campus Areas
CREATE TABLE IF NOT EXISTS campus_areas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Issues Table (Root cause & tracking)
CREATE TABLE IF NOT EXISTS issues (
  id INT AUTO_INCREMENT PRIMARY KEY,
  issue_code VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  department VARCHAR(150) NOT NULL,
  category VARCHAR(100) NOT NULL,
  priority ENUM('critical', 'high', 'medium', 'low') NOT NULL DEFAULT 'medium',
  status ENUM('identified', 'investigating', 'root_cause_found', 'action_planned', 'resolved') NOT NULL DEFAULT 'identified',
  impact_score DECIMAL(5,2) DEFAULT 0.00,
  is_emerging TINYINT(1) DEFAULT 0,
  emerging_reason VARCHAR(255) DEFAULT NULL,
  sentiment_breakdown JSON DEFAULT NULL,
  feedback_count INT DEFAULT 0,
  root_cause TEXT NULL,
  five_whys JSON NULL,
  assigned_to VARCHAR(150) NULL,
  target_resolution_date DATE NULL,
  resolved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_issues_department (department),
  INDEX idx_issues_status (status),
  INDEX idx_issues_priority (priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Feedback Table
CREATE TABLE IF NOT EXISTS feedback (
  id INT AUTO_INCREMENT PRIMARY KEY,
  feedback_code VARCHAR(50) NULL UNIQUE,
  user_id INT NULL,
  student_name VARCHAR(100) NULL,
  department VARCHAR(150) NOT NULL,
  category VARCHAR(100) NOT NULL,
  sub_category VARCHAR(100) NULL,
  custom_sub_category VARCHAR(150) NULL,
  sentiment ENUM('positive', 'neutral', 'negative') NOT NULL DEFAULT 'neutral',
  sentiment_score INT DEFAULT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  is_anonymous TINYINT(1) DEFAULT 0,
  semester VARCHAR(50) NULL,
  academic_year VARCHAR(50) NULL,
  location VARCHAR(150) NULL,
  campus_area VARCHAR(100) NULL,
  equipment_id VARCHAR(100) NULL,
  urgency ENUM('low', 'medium', 'high', 'critical') DEFAULT 'low',
  priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
  theme VARCHAR(150) NULL,
  ai_summary TEXT NULL,
  ai_confidence INT DEFAULT NULL,
  ai_provider VARCHAR(50) DEFAULT 'fallback',
  ai_status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
  ai_error_message TEXT DEFAULT NULL,
  ai_analyzed_at TIMESTAMP NULL DEFAULT NULL,
  status ENUM('submitted', 'new', 'received', 'under_review', 'action_planned', 'in_progress', 'action_taken', 'resolved', 'closed', 'escalated') DEFAULT 'submitted',
  status_notes TEXT NULL,
  assigned_to VARCHAR(150) NULL,
  issue_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_feedback_department (department),
  INDEX idx_feedback_category (category),
  INDEX idx_feedback_sentiment (sentiment),
  INDEX idx_feedback_priority (priority),
  INDEX idx_feedback_status (status),
  INDEX idx_feedback_is_anonymous (is_anonymous),
  INDEX idx_feedback_created_at (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Possible Causes (Linked to Issues for Root Cause Explorer)
CREATE TABLE IF NOT EXISTS possible_causes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  issue_id INT NOT NULL,
  cause_text TEXT NOT NULL,
  likelihood ENUM('high', 'medium', 'low') DEFAULT 'medium',
  confidence INT DEFAULT 75,
  evidence TEXT DEFAULT NULL,
  supporting_count INT DEFAULT 1,
  verified BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Corrective & Preventive Actions Table
CREATE TABLE IF NOT EXISTS actions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  action_code VARCHAR(50) NULL UNIQUE,
  issue_id INT NULL,
  alert_id INT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  department VARCHAR(150) NOT NULL,
  assigned_to VARCHAR(150) NULL,
  priority ENUM('critical', 'high', 'medium', 'low') NOT NULL DEFAULT 'medium',
  status ENUM('planned', 'pending', 'in_progress', 'completed', 'overdue', 'cancelled') NOT NULL DEFAULT 'planned',
  due_date DATE NULL,
  completed_at TIMESTAMP NULL,
  cost_estimate DECIMAL(10,2) DEFAULT 0.00,
  notes TEXT NULL,
  completion_notes TEXT NULL,
  resolution_notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_actions_department (department),
  INDEX idx_actions_status (status),
  FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Action Progress Updates (Audit Trail)
CREATE TABLE IF NOT EXISTS action_updates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  action_id INT NOT NULL,
  update_text TEXT NOT NULL,
  previous_status VARCHAR(50) NULL,
  new_status VARCHAR(50) NOT NULL,
  created_by VARCHAR(150) NOT NULL,
  user_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_action_updates_action (action_id),
  FOREIGN KEY (action_id) REFERENCES actions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Alerts Table
CREATE TABLE IF NOT EXISTS alerts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(100) NOT NULL,
  severity ENUM('info', 'warning', 'critical') NOT NULL DEFAULT 'info',
  department VARCHAR(150) NULL,
  issue_id INT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  status ENUM('new', 'read', 'acknowledged', 'resolved', 'dismissed') DEFAULT 'new',
  read_at TIMESTAMP NULL,
  acknowledged_at TIMESTAMP NULL,
  resolved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_alerts_department (department),
  INDEX idx_alerts_severity (severity),
  INDEX idx_alerts_status (status),
  INDEX idx_alerts_issue (issue_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  link VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notifications_user (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- Table: recommendations (Phase 3B: HOD Recommendation Workflow)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recommendations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recommendation_code VARCHAR(50) NOT NULL UNIQUE,
  issue_id INT NOT NULL,
  department VARCHAR(150) NOT NULL,
  title VARCHAR(255) NOT NULL,
  justification TEXT NOT NULL,
  category VARCHAR(100) NOT NULL,
  priority ENUM('critical', 'high', 'medium', 'low') NOT NULL DEFAULT 'medium',
  estimated_cost DECIMAL(10,2) DEFAULT 0.00,
  created_by INT NOT NULL,
  created_by_name VARCHAR(150) DEFAULT NULL,
  status ENUM('pending', 'approved', 'rejected', 'deferred') NOT NULL DEFAULT 'pending',
  reviewed_by INT DEFAULT NULL,
  reviewed_by_name VARCHAR(150) DEFAULT NULL,
  reviewed_at TIMESTAMP NULL DEFAULT NULL,
  review_notes TEXT DEFAULT NULL,
  action_id INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_rec_dept (department),
  INDEX idx_rec_status (status),
  INDEX idx_rec_issue (issue_id),
  INDEX idx_rec_created_by (created_by),
  INDEX idx_rec_action (action_id),
  CONSTRAINT fk_rec_issue FOREIGN KEY (issue_id) REFERENCES issues (id) ON DELETE CASCADE,
  CONSTRAINT fk_rec_user FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_rec_reviewer FOREIGN KEY (reviewed_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_rec_action FOREIGN KEY (action_id) REFERENCES actions (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- Table: recommendation_updates (Phase 3B: Audit Trail)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recommendation_updates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recommendation_id INT NOT NULL,
  previous_status VARCHAR(50) DEFAULT NULL,
  new_status VARCHAR(50) NOT NULL,
  update_text TEXT DEFAULT NULL,
  actor_id INT DEFAULT NULL,
  actor_name VARCHAR(150) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_rec_update (recommendation_id),
  CONSTRAINT fk_rec_update_rec FOREIGN KEY (recommendation_id) REFERENCES recommendations (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

