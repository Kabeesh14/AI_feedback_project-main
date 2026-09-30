const { pool } = require('../config/db');

async function migratePhase4() {
  console.log('[MIGRATION] Running Phase 4 AI & Root-Cause enhancements...');
  try {
    // 1. Enhance feedback table with AI pipeline columns
    const feedbackCols = [
      { name: 'sentiment_score', sql: 'ALTER TABLE feedback ADD COLUMN sentiment_score INT DEFAULT NULL AFTER sentiment' },
      { name: 'ai_confidence', sql: 'ALTER TABLE feedback ADD COLUMN ai_confidence INT DEFAULT NULL AFTER ai_summary' },
      { name: 'ai_provider', sql: "ALTER TABLE feedback ADD COLUMN ai_provider VARCHAR(50) DEFAULT 'fallback' AFTER ai_confidence" },
      { name: 'ai_status', sql: "ALTER TABLE feedback ADD COLUMN ai_status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending' AFTER ai_provider" },
      { name: 'ai_error_message', sql: 'ALTER TABLE feedback ADD COLUMN ai_error_message TEXT DEFAULT NULL AFTER ai_status' },
      { name: 'ai_analyzed_at', sql: 'ALTER TABLE feedback ADD COLUMN ai_analyzed_at TIMESTAMP NULL DEFAULT NULL AFTER ai_error_message' }
    ];

    for (const col of feedbackCols) {
      const [existing] = await pool.query(`SHOW COLUMNS FROM feedback LIKE '${col.name}'`);
      if (existing.length === 0) {
        await pool.query(col.sql);
        console.log(`✅ feedback.${col.name} added.`);
      }
    }

    // 2. Enhance possible_causes table
    const causeCols = [
      { name: 'confidence', sql: 'ALTER TABLE possible_causes ADD COLUMN confidence INT DEFAULT 75 AFTER likelihood' },
      { name: 'evidence', sql: 'ALTER TABLE possible_causes ADD COLUMN evidence TEXT DEFAULT NULL AFTER confidence' },
      { name: 'supporting_count', sql: 'ALTER TABLE possible_causes ADD COLUMN supporting_count INT DEFAULT 1 AFTER evidence' }
    ];

    for (const col of causeCols) {
      const [existing] = await pool.query(`SHOW COLUMNS FROM possible_causes LIKE '${col.name}'`);
      if (existing.length === 0) {
        await pool.query(col.sql);
        console.log(`✅ possible_causes.${col.name} added.`);
      }
    }

    // 3. Enhance issues table
    const issueCols = [
      { name: 'is_emerging', sql: 'ALTER TABLE issues ADD COLUMN is_emerging TINYINT(1) DEFAULT 0 AFTER impact_score' },
      { name: 'emerging_reason', sql: 'ALTER TABLE issues ADD COLUMN emerging_reason VARCHAR(255) DEFAULT NULL AFTER is_emerging' },
      { name: 'sentiment_breakdown', sql: 'ALTER TABLE issues ADD COLUMN sentiment_breakdown JSON DEFAULT NULL AFTER emerging_reason' }
    ];

    for (const col of issueCols) {
      const [existing] = await pool.query(`SHOW COLUMNS FROM issues LIKE '${col.name}'`);
      if (existing.length === 0) {
        await pool.query(col.sql);
        console.log(`✅ issues.${col.name} added.`);
      }
    }

    console.log('[MIGRATION] Phase 4 enhancements applied successfully.');
    process.exit(0);
  } catch (error) {
    console.error('[MIGRATION ERROR]:', error);
    process.exit(1);
  }
}

migratePhase4();
