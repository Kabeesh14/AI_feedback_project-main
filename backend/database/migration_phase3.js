const { pool } = require('../config/db');

async function migrate() {
  console.log('[MIGRATION] Running Phase 3 feedback schema enhancements...');
  try {
    // 1. Update status enum to include 'new' as well as all supported statuses
    await pool.query(`
      ALTER TABLE feedback 
      MODIFY COLUMN status ENUM('submitted','new','received','under_review','action_planned','in_progress','action_taken','resolved','closed','escalated') 
      DEFAULT 'submitted'
    `);
    await pool.query("UPDATE feedback SET status = 'submitted' WHERE status = 'new'");
    console.log('✅ Status column updated and existing records migrated.');

    // 2. Add is_anonymous
    const [anonCols] = await pool.query("SHOW COLUMNS FROM feedback LIKE 'is_anonymous'");
    if (anonCols.length === 0) {
      await pool.query("ALTER TABLE feedback ADD COLUMN is_anonymous TINYINT(1) DEFAULT 0 AFTER comment");
      console.log('✅ is_anonymous column added.');
    }

    // 3. Add semester and academic_year
    const [semCols] = await pool.query("SHOW COLUMNS FROM feedback LIKE 'semester'");
    if (semCols.length === 0) {
      await pool.query("ALTER TABLE feedback ADD COLUMN semester VARCHAR(50) NULL AFTER is_anonymous");
      await pool.query("ALTER TABLE feedback ADD COLUMN academic_year VARCHAR(50) NULL AFTER semester");
      console.log('✅ semester and academic_year columns added.');
    }

    // 4. Add priority
    const [prioCols] = await pool.query("SHOW COLUMNS FROM feedback LIKE 'priority'");
    if (prioCols.length === 0) {
      await pool.query("ALTER TABLE feedback ADD COLUMN priority ENUM('low','medium','high','critical') DEFAULT 'medium' AFTER urgency");
      console.log('✅ priority column added.');
    }

    // 5. Add theme and ai_summary
    const [themeCols] = await pool.query("SHOW COLUMNS FROM feedback LIKE 'theme'");
    if (themeCols.length === 0) {
      await pool.query("ALTER TABLE feedback ADD COLUMN theme VARCHAR(150) NULL AFTER priority");
      await pool.query("ALTER TABLE feedback ADD COLUMN ai_summary TEXT NULL AFTER theme");
      console.log('✅ theme and ai_summary columns added.');
    }

    // 6. Helpful indexes
    const indexes = [
      { name: 'idx_feedback_is_anonymous', sql: 'CREATE INDEX idx_feedback_is_anonymous ON feedback(is_anonymous)' },
      { name: 'idx_feedback_priority', sql: 'CREATE INDEX idx_feedback_priority ON feedback(priority)' }
    ];

    for (const idx of indexes) {
      try {
        await pool.query(idx.sql);
        console.log(`✅ Index verified: ${idx.name}`);
      } catch (err) {
        if (err.code !== 'ER_DUP_KEYNAME') {
          console.warn(`Index note (${idx.name}): ${err.message}`);
        }
      }
    }

    console.log('[MIGRATION] Phase 3 schema enhancements applied successfully.');
    process.exit(0);
  } catch (error) {
    console.error('[MIGRATION ERROR]:', error);
    process.exit(1);
  }
}

migrate();
