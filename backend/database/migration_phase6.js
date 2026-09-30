const { pool } = require('../config/db');

async function migratePhase6() {
  console.log('[MIGRATION] Running Phase 6 Smart Alerts, Action Center & Impact Tracking schema enhancements...');
  try {
    // 1. Enhance alerts table
    // 1a. Expand type to VARCHAR(100) to support all 7 alert types
    try {
      await pool.query('ALTER TABLE alerts MODIFY COLUMN type VARCHAR(100) NOT NULL');
      console.log('✅ alerts.type modified to VARCHAR(100).');
    } catch (err) {
      console.warn('⚠️ Could not modify alerts.type:', err.message);
    }

    // 1b. Add issue_id, status, timestamps to alerts
    const alertCols = [
      { name: 'issue_id', sql: 'ALTER TABLE alerts ADD COLUMN issue_id INT NULL AFTER department' },
      { name: 'status', sql: "ALTER TABLE alerts ADD COLUMN status ENUM('new', 'read', 'acknowledged', 'resolved', 'dismissed') DEFAULT 'new' AFTER is_read" },
      { name: 'read_at', sql: 'ALTER TABLE alerts ADD COLUMN read_at TIMESTAMP NULL AFTER status' },
      { name: 'acknowledged_at', sql: 'ALTER TABLE alerts ADD COLUMN acknowledged_at TIMESTAMP NULL AFTER read_at' },
      { name: 'resolved_at', sql: 'ALTER TABLE alerts ADD COLUMN resolved_at TIMESTAMP NULL AFTER acknowledged_at' }
    ];

    for (const col of alertCols) {
      const [existing] = await pool.query(`SHOW COLUMNS FROM alerts LIKE '${col.name}'`);
      if (existing.length === 0) {
        await pool.query(col.sql);
        console.log(`✅ alerts.${col.name} added.`);
      }
    }

    // 1c. Add useful indexes on alerts
    const alertIndexes = [
      { name: 'idx_alerts_status', sql: 'CREATE INDEX idx_alerts_status ON alerts(status)' },
      { name: 'idx_alerts_issue', sql: 'CREATE INDEX idx_alerts_issue ON alerts(issue_id)' }
    ];
    for (const idx of alertIndexes) {
      try {
        await pool.query(idx.sql);
        console.log(`✅ Index ${idx.name} created.`);
      } catch (err) {
        // Index might already exist
      }
    }

    // 2. Enhance actions table
    // 2a. Modify status to include 'planned' and 'cancelled'
    try {
      await pool.query("ALTER TABLE actions MODIFY COLUMN status ENUM('planned', 'pending', 'in_progress', 'completed', 'overdue', 'cancelled') NOT NULL DEFAULT 'planned'");
      console.log('✅ actions.status modified to include planned & cancelled.');
    } catch (err) {
      console.warn('⚠️ Could not modify actions.status:', err.message);
    }

    const actionCols = [
      { name: 'alert_id', sql: 'ALTER TABLE actions ADD COLUMN alert_id INT NULL AFTER issue_id' },
      { name: 'completion_notes', sql: 'ALTER TABLE actions ADD COLUMN completion_notes TEXT NULL AFTER notes' },
      { name: 'resolution_notes', sql: 'ALTER TABLE actions ADD COLUMN resolution_notes TEXT NULL AFTER completion_notes' }
    ];

    for (const col of actionCols) {
      const [existing] = await pool.query(`SHOW COLUMNS FROM actions LIKE '${col.name}'`);
      if (existing.length === 0) {
        await pool.query(col.sql);
        console.log(`✅ actions.${col.name} added.`);
      }
    }

    // 3. Create action_updates table for audit trail
    await pool.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ action_updates table verified/created.');

    console.log('[MIGRATION] Phase 6 schema enhancements applied successfully.');
    process.exit(0);
  } catch (error) {
    console.error('[MIGRATION ERROR]:', error);
    process.exit(1);
  }
}

migratePhase6();
