-- ====================================================================
-- FEEDBACKIQ SEED DATA
-- Default records for 9 official departments, demo users, issues, actions, alerts
-- ====================================================================

USE feedbackiq_db;

-- 1. Insert 9 Official Departments
INSERT INTO departments (id, name, code) VALUES
  (1, 'Information Technology', 'IT'),
  (2, 'Cyber Security', 'CYBER'),
  (3, 'Computer Science and Business Engineering', 'CSBE'),
  (4, 'Biotechnology and Biomedical Engineering', 'BTBM'),
  (5, 'Artificial Intelligence & Data Science', 'AIDS'),
  (6, 'Computer Science & Engineering', 'CSE'),
  (7, 'Electronics & Communication Engineering', 'ECE'),
  (8, 'Mechanical Engineering', 'MECH'),
  (9, 'Civil Engineering', 'CIVIL')
ON DUPLICATE KEY UPDATE name=VALUES(name), code=VALUES(code);

-- 2. Insert Campus Areas
INSERT INTO campus_areas (id, name, description) VALUES
  (1, 'Central Library', 'Main academic library and quiet study areas'),
  (2, 'Campus Canteen & Cafeteria', 'Dining halls and cafeteria counters'),
  (3, 'Student Hostels', 'Hostel blocks and residential amenities'),
  (4, 'Sports Complex & Gym', 'Indoor/outdoor sports facilities'),
  (5, 'Computing & Research Labs', 'High-performance computing and departmental laboratories'),
  (6, 'Administrative Block', 'Student affairs, fee counters, and examination offices'),
  (7, 'Restrooms & Sanitation', 'Hygiene facilities across academic blocks'),
  (8, 'Campus Transport & Parking', 'Bus terminal and student parking bays')
ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description);

-- 3. Insert Demo Users
-- Note: Default password is 'password123'
-- Hash generated with bcrypt: $2b$10$1gvOLTH/awg8XibZgB.DZu8LmV2THK1ZhRZABGs0XixvFP96sVn2O
INSERT INTO users (id, name, email, password_hash, role, department, department_id) VALUES
  (1, 'Aarav Sharma', 'student.it@college.edu', '$2b$10$1gvOLTH/awg8XibZgB.DZu8LmV2THK1ZhRZABGs0XixvFP96sVn2O', 'student', 'Information Technology', 1),
  (2, 'Vikram Roy', 'student.civil@college.edu', '$2b$10$1gvOLTH/awg8XibZgB.DZu8LmV2THK1ZhRZABGs0XixvFP96sVn2O', 'student', 'Civil Engineering', 9),
  (3, 'Dr. Suresh Menon', 'hod.civil@college.edu', '$2b$10$1gvOLTH/awg8XibZgB.DZu8LmV2THK1ZhRZABGs0XixvFP96sVn2O', 'hod', 'Civil Engineering', 9),
  (4, 'Dr. Meera Nambiar', 'hod.cse@college.edu', '$2b$10$1gvOLTH/awg8XibZgB.DZu8LmV2THK1ZhRZABGs0XixvFP96sVn2O', 'hod', 'Computer Science & Engineering', 6),
  (5, 'Dean Academic Affairs', 'management@college.edu', '$2b$10$1gvOLTH/awg8XibZgB.DZu8LmV2THK1ZhRZABGs0XixvFP96sVn2O', 'management', NULL, NULL),
  (101, 'Student Demo', 'student@demo.com', '$2b$10$1gvOLTH/awg8XibZgB.DZu8LmV2THK1ZhRZABGs0XixvFP96sVn2O', 'student', 'Artificial Intelligence & Data Science', 5),
  (102, 'Dr. Sarah Chen (HOD Demo)', 'hod@demo.com', '$2b$10$1gvOLTH/awg8XibZgB.DZu8LmV2THK1ZhRZABGs0XixvFP96sVn2O', 'hod', 'Artificial Intelligence & Data Science', 5),
  (103, 'Management Demo', 'management@demo.com', '$2b$10$1gvOLTH/awg8XibZgB.DZu8LmV2THK1ZhRZABGs0XixvFP96sVn2O', 'management', NULL, NULL)
ON DUPLICATE KEY UPDATE name=VALUES(name), password_hash=VALUES(password_hash), role=VALUES(role), department=VALUES(department), department_id=VALUES(department_id);

-- 4. Sample Issues
INSERT INTO issues (id, issue_code, title, department, category, priority, status, impact_score, feedback_count, root_cause, assigned_to, target_resolution_date) VALUES
  (1, 'ISS-001', 'High Room Temperature in Lab 301', 'Information Technology', 'Facilities', 'high', 'action_planned', 78.50, 14, 'Air handling unit compressor refrigerant leak and inadequate ventilation cycle.', 'Prof. Anand (Lab In-charge)', DATE_ADD(CURDATE(), INTERVAL 7 DAY)),
  (2, 'ISS-002', 'Slow MATLAB and Python Kernel Executions', 'Artificial Intelligence & Data Science', 'Lab Equipment', 'medium', 'investigating', 62.00, 9, 'Shared server memory allocation bottleneck during peak afternoon project sessions.', 'Network & Systems Admin', DATE_ADD(CURDATE(), INTERVAL 14 DAY)),
  (3, 'ISS-003', 'Library WiFi Connectivity Drops in 2nd Floor Reference Section', 'Information Technology', 'Infrastructure', 'critical', 'root_cause_found', 89.00, 27, 'Defective PoE access point switch power supply causing intermittent reboot cycles.', 'IT Infrastructure Team', DATE_ADD(CURDATE(), INTERVAL 3 DAY)),
  (4, 'ISS-004', 'Delayed Evaluation Feedback for Operating Systems Lab 4', 'Computer Science & Engineering', 'Faculty', 'low', 'resolved', 35.00, 6, 'Teaching assistant shortage during mid-semester examination week.', 'HOD CSE', CURDATE())
ON DUPLICATE KEY UPDATE title=VALUES(title), status=VALUES(status);

-- 5. Possible Causes for Issues
INSERT INTO possible_causes (issue_id, cause_text, likelihood, verified) VALUES
  (1, 'Compressor unit refrigerant leak', 'high', TRUE),
  (1, 'Blocked dust filters in central duct', 'medium', TRUE),
  (1, 'Overcrowded lab capacity exceeding AC tonnage', 'low', FALSE),
  (2, 'Server memory paging to slow magnetic storage', 'high', TRUE),
  (2, 'Multiple unconstrained docker containers running', 'high', FALSE),
  (3, 'Defective PoE switch power supply', 'high', TRUE),
  (3, 'Radio interference from adjacent metal ducting', 'low', FALSE)
ON DUPLICATE KEY UPDATE likelihood=VALUES(likelihood), verified=VALUES(verified);

-- 6. Sample Corrective Actions
INSERT INTO actions (id, action_code, issue_id, title, description, department, assigned_to, priority, status, due_date, cost_estimate) VALUES
  (1, 'ACT-001', 1, 'Replace AC compressor valve and replenish coolant', 'Procure certified technician and refill R-410A refrigerant for Lab 301.', 'Information Technology', 'Estate & Maintenance Team', 'high', 'in_progress', DATE_ADD(CURDATE(), INTERVAL 4 DAY), 8500.00),
  (2, 'ACT-002', 3, 'Install dual-band Enterprise WiFi 6 Access Point', 'Replace aging PoE switch and position new enterprise AP on 2nd floor library.', 'Information Technology', 'Network Support Cell', 'critical', 'pending', DATE_ADD(CURDATE(), INTERVAL 3 DAY), 14000.00),
  (3, 'ACT-003', 2, 'Upgrade RAM to 128GB on AI Compute Server #2', 'Add DDR4 ECC RAM modules to resolve Python kernel out-of-memory errors.', 'Artificial Intelligence & Data Science', 'Systems Admin', 'medium', 'pending', DATE_ADD(CURDATE(), INTERVAL 10 DAY), 22000.00)
ON DUPLICATE KEY UPDATE title=VALUES(title), status=VALUES(status);

-- 7. Sample Alerts
INSERT INTO alerts (id, type, severity, department, title, message) VALUES
  (1, 'sentiment_spike', 'critical', 'Information Technology', 'Negative Sentiment Surge in IT Department', 'Negative feedback volume jumped by 42% over the last 48 hours, predominantly regarding Library WiFi.'),
  (2, 'sla_breach', 'warning', 'Artificial Intelligence & Data Science', 'Lab Performance Resolution Pending', 'Ticket ISS-002 regarding computing lab memory execution is approaching its 14-day target SLA.'),
  (3, 'trend_warning', 'info', 'Computer Science & Engineering', 'Positive Feedback Shift for Curriculum Delivery', 'Recent semester feedback shows 85% satisfaction rating on newly introduced Cloud Computing modules.')
ON DUPLICATE KEY UPDATE title=VALUES(title), severity=VALUES(severity);

-- 8. Sample Feedback Entries
INSERT INTO feedback (feedback_code, student_name, department, category, sub_category, sentiment, rating, comment, location, campus_area, urgency, status) VALUES
  ('FB-1001', 'Aarav Sharma', 'Information Technology', 'Infrastructure', 'WiFi / Network', 'negative', 1, 'The WiFi connection constantly disconnects every 5 minutes in the Library 2nd floor reference section.', 'Library 2nd Floor', 'Central Library', 'critical', 'under_review'),
  ('FB-1002', 'Pooja Verma', 'Information Technology', 'Facilities', 'Air Conditioning', 'negative', 2, 'Lab 301 gets extremely warm in the afternoon sessions. The AC does not cool properly.', 'Lab 301', 'Computing & Research Labs', 'high', 'action_taken'),
  ('FB-1003', 'Karthik Raja', 'Artificial Intelligence & Data Science', 'Lab Equipment', 'Workstation Speed', 'neutral', 3, 'Deep learning models take a very long time to run on PC-12. Please upgrade GPU memory drivers.', 'AI Lab 2', 'Computing & Research Labs', 'medium', 'new'),
  ('FB-1004', 'Divya Patel', 'Computer Science & Engineering', 'Faculty', 'Teaching Methodology', 'positive', 5, 'Prof. Raman explains Distributed Systems concepts with great practical examples.', 'Room 204', 'Administrative Block', 'low', 'resolved'),
  ('FB-1005', 'Nikhil Nair', 'Cyber Security', 'Infrastructure', 'Lab Security Softwares', 'positive', 4, 'Kali Linux virtual machines are pre-configured properly for ethical hacking lab.', 'Cyber Defense Lab', 'Computing & Research Labs', 'low', 'resolved')
ON DUPLICATE KEY UPDATE comment=VALUES(comment);
