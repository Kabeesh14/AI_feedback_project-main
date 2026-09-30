-- ==========================================================
-- Migration: Phase 3B - Recommendations and Audit Updates
-- ==========================================================

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
