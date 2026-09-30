const path = require('path');
const backendRoot = path.join(__dirname, '..');
require(path.join(backendRoot, 'node_modules', 'dotenv')).config({ path: path.join(backendRoot, '.env') });
const { pool } = require(path.join(backendRoot, 'config', 'db.js'));

async function columnExists(table, column) {
  const [cols] = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [table, column]
  );
  return cols.length > 0;
}

async function indexExists(table, indexName) {
  const [indexes] = await pool.query(
    `SELECT index_name FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?`,
    [table, indexName]
  );
  return indexes.length > 0;
}

async function runMigration() {
  console.log('====================================================');
  console.log('🚀 STARTING PHASE 3 DATABASE EXTENSION MIGRATION');
  console.log('   Non-destructive, additive changes only');
  console.log('====================================================\n');

  try {
    // ----------------------------------------------------------------
    // 1. EXTEND users TABLE
    // ----------------------------------------------------------------
    console.log('--- 1. UPDATING users TABLE ---');

    // 1a. Extend role ENUM
    console.log('Updating users.role ENUM to include bus_incharge, transport_incharge, hostel_warden...');
    await pool.query(`
      ALTER TABLE users 
      MODIFY COLUMN role ENUM(
        'student', 
        'faculty', 
        'hod', 
        'management', 
        'bus_incharge', 
        'transport_incharge', 
        'hostel_warden'
      ) NOT NULL
    `);
    console.log('✅ users.role ENUM extended successfully.');

    // 1b. Add portal column
    if (!(await columnExists('users', 'portal'))) {
      console.log('Adding users.portal column...');
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN portal ENUM('education', 'bus', 'hostel') NOT NULL DEFAULT 'education' AFTER role
      `);
      console.log('✅ users.portal added (default: education).');
    } else {
      console.log('ℹ️ users.portal already exists.');
    }

    // 1c. Add bus metadata columns
    if (!(await columnExists('users', 'bus_number'))) {
      console.log('Adding users.bus_number column...');
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN bus_number VARCHAR(50) NULL DEFAULT NULL AFTER section
      `);
      console.log('✅ users.bus_number added.');
    }

    if (!(await columnExists('users', 'boarding_point'))) {
      console.log('Adding users.boarding_point column...');
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN boarding_point VARCHAR(150) NULL DEFAULT NULL AFTER bus_number
      `);
      console.log('✅ users.boarding_point added.');
    }

    // 1d. Add hostel metadata columns
    if (!(await columnExists('users', 'room_number'))) {
      console.log('Adding users.room_number column...');
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN room_number VARCHAR(50) NULL DEFAULT NULL AFTER boarding_point
      `);
      console.log('✅ users.room_number added.');
    }

    if (!(await columnExists('users', 'floor'))) {
      console.log('Adding users.floor column...');
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN floor ENUM('Ground Floor', '1st Floor', '2nd Floor', '3rd Floor') NULL DEFAULT NULL AFTER room_number
      `);
      console.log('✅ users.floor added.');
    }

    if (!(await columnExists('users', 'assigned_floor'))) {
      console.log('Adding users.assigned_floor column...');
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN assigned_floor ENUM('Ground Floor', '1st Floor', '2nd Floor', '3rd Floor') NULL DEFAULT NULL AFTER floor
      `);
      console.log('✅ users.assigned_floor added.');
    }

    // 1e. Add indexes on users
    const userIndexes = [
      { name: 'idx_users_portal', col: 'portal' },
      { name: 'idx_users_bus_number', col: 'bus_number' },
      { name: 'idx_users_floor', col: 'floor' },
      { name: 'idx_users_assigned_floor', col: 'assigned_floor' }
    ];

    for (const idx of userIndexes) {
      if (!(await indexExists('users', idx.name))) {
        await pool.query(`CREATE INDEX ${idx.name} ON users(${idx.col})`);
        console.log(`✅ Index ${idx.name} created on users(${idx.col}).`);
      }
    }

    // ----------------------------------------------------------------
    // 2. EXTEND feedback TABLE
    // ----------------------------------------------------------------
    console.log('\n--- 2. UPDATING feedback TABLE ---');

    if (!(await columnExists('feedback', 'portal'))) {
      console.log('Adding feedback.portal column...');
      await pool.query(`
        ALTER TABLE feedback 
        ADD COLUMN portal ENUM('education', 'bus', 'hostel') NOT NULL DEFAULT 'education' AFTER user_id
      `);
      console.log('✅ feedback.portal added.');
    }

    if (!(await columnExists('feedback', 'bus_number'))) {
      console.log('Adding feedback.bus_number column...');
      await pool.query(`
        ALTER TABLE feedback 
        ADD COLUMN bus_number VARCHAR(50) NULL DEFAULT NULL AFTER custom_sub_category
      `);
      console.log('✅ feedback.bus_number added.');
    }

    if (!(await columnExists('feedback', 'floor'))) {
      console.log('Adding feedback.floor column...');
      await pool.query(`
        ALTER TABLE feedback 
        ADD COLUMN floor ENUM('Ground Floor', '1st Floor', '2nd Floor', '3rd Floor') NULL DEFAULT NULL AFTER bus_number
      `);
      console.log('✅ feedback.floor added.');
    }

    // Modify department to NULLable for bus feedback
    console.log('Modifying feedback.department to allow NULL...');
    await pool.query(`
      ALTER TABLE feedback 
      MODIFY COLUMN department VARCHAR(150) NULL DEFAULT NULL
    `);
    console.log('✅ feedback.department modified to NULLable.');

    const feedbackIndexes = [
      { name: 'idx_feedback_portal', col: 'portal' },
      { name: 'idx_feedback_bus_number', col: 'bus_number' },
      { name: 'idx_feedback_floor', col: 'floor' }
    ];

    for (const idx of feedbackIndexes) {
      if (!(await indexExists('feedback', idx.name))) {
        await pool.query(`CREATE INDEX ${idx.name} ON feedback(${idx.col})`);
        console.log(`✅ Index ${idx.name} created on feedback(${idx.col}).`);
      }
    }

    // ----------------------------------------------------------------
    // 3. EXTEND issues TABLE
    // ----------------------------------------------------------------
    console.log('\n--- 3. UPDATING issues TABLE ---');

    if (!(await columnExists('issues', 'portal'))) {
      console.log('Adding issues.portal column...');
      await pool.query(`
        ALTER TABLE issues 
        ADD COLUMN portal ENUM('education', 'bus', 'hostel') NOT NULL DEFAULT 'education' AFTER title
      `);
      console.log('✅ issues.portal added.');
    }

    if (!(await columnExists('issues', 'bus_number'))) {
      console.log('Adding issues.bus_number column...');
      await pool.query(`
        ALTER TABLE issues 
        ADD COLUMN bus_number VARCHAR(50) NULL DEFAULT NULL AFTER category
      `);
      console.log('✅ issues.bus_number added.');
    }

    if (!(await columnExists('issues', 'floor'))) {
      console.log('Adding issues.floor column...');
      await pool.query(`
        ALTER TABLE issues 
        ADD COLUMN floor ENUM('Ground Floor', '1st Floor', '2nd Floor', '3rd Floor') NULL DEFAULT NULL AFTER bus_number
      `);
      console.log('✅ issues.floor added.');
    }

    console.log('Modifying issues.department to allow NULL...');
    await pool.query(`
      ALTER TABLE issues 
      MODIFY COLUMN department VARCHAR(150) NULL DEFAULT NULL
    `);
    console.log('✅ issues.department modified to NULLable.');

    const issueIndexes = [
      { name: 'idx_issues_portal', col: 'portal' },
      { name: 'idx_issues_bus_number', col: 'bus_number' },
      { name: 'idx_issues_floor', col: 'floor' }
    ];

    for (const idx of issueIndexes) {
      if (!(await indexExists('issues', idx.name))) {
        await pool.query(`CREATE INDEX ${idx.name} ON issues(${idx.col})`);
        console.log(`✅ Index ${idx.name} created on issues(${idx.col}).`);
      }
    }

    // ----------------------------------------------------------------
    // 4. EXTEND actions TABLE
    // ----------------------------------------------------------------
    console.log('\n--- 4. UPDATING actions TABLE ---');

    if (!(await columnExists('actions', 'portal'))) {
      console.log('Adding actions.portal column...');
      await pool.query(`
        ALTER TABLE actions 
        ADD COLUMN portal ENUM('education', 'bus', 'hostel') NOT NULL DEFAULT 'education' AFTER alert_id
      `);
      console.log('✅ actions.portal added.');
    }

    if (!(await columnExists('actions', 'bus_number'))) {
      console.log('Adding actions.bus_number column...');
      await pool.query(`
        ALTER TABLE actions 
        ADD COLUMN bus_number VARCHAR(50) NULL DEFAULT NULL AFTER department
      `);
      console.log('✅ actions.bus_number added.');
    }

    if (!(await columnExists('actions', 'floor'))) {
      console.log('Adding actions.floor column...');
      await pool.query(`
        ALTER TABLE actions 
        ADD COLUMN floor ENUM('Ground Floor', '1st Floor', '2nd Floor', '3rd Floor') NULL DEFAULT NULL AFTER bus_number
      `);
      console.log('✅ actions.floor added.');
    }

    console.log('Modifying actions.department to allow NULL...');
    await pool.query(`
      ALTER TABLE actions 
      MODIFY COLUMN department VARCHAR(150) NULL DEFAULT NULL
    `);
    console.log('✅ actions.department modified to NULLable.');

    if (!(await indexExists('actions', 'idx_actions_portal'))) {
      await pool.query(`CREATE INDEX idx_actions_portal ON actions(portal)`);
      console.log('✅ Index idx_actions_portal created on actions(portal).');
    }

    // ----------------------------------------------------------------
    // 5. EXTEND feedback_forms TABLE
    // ----------------------------------------------------------------
    console.log('\n--- 5. UPDATING feedback_forms TABLE ---');

    if (!(await columnExists('feedback_forms', 'portal'))) {
      console.log('Adding feedback_forms.portal column...');
      await pool.query(`
        ALTER TABLE feedback_forms 
        ADD COLUMN portal ENUM('education', 'bus', 'hostel') NOT NULL DEFAULT 'education' AFTER department
      `);
      console.log('✅ feedback_forms.portal added.');
    }

    if (!(await columnExists('feedback_forms', 'bus_number'))) {
      console.log('Adding feedback_forms.bus_number column...');
      await pool.query(`
        ALTER TABLE feedback_forms 
        ADD COLUMN bus_number VARCHAR(50) NULL DEFAULT NULL AFTER portal
      `);
      console.log('✅ feedback_forms.bus_number added.');
    }

    if (!(await columnExists('feedback_forms', 'floor'))) {
      console.log('Adding feedback_forms.floor column...');
      await pool.query(`
        ALTER TABLE feedback_forms 
        ADD COLUMN floor ENUM('Ground Floor', '1st Floor', '2nd Floor', '3rd Floor') NULL DEFAULT NULL AFTER bus_number
      `);
      console.log('✅ feedback_forms.floor added.');
    }

    console.log('Modifying feedback_forms department fields to allow NULL...');
    await pool.query(`
      ALTER TABLE feedback_forms 
      MODIFY COLUMN department_id INT NULL DEFAULT NULL
    `);
    await pool.query(`
      ALTER TABLE feedback_forms 
      MODIFY COLUMN department VARCHAR(150) NULL DEFAULT NULL
    `);
    console.log('✅ feedback_forms department fields modified to NULLable.');

    if (!(await indexExists('feedback_forms', 'idx_feedback_forms_portal'))) {
      await pool.query(`CREATE INDEX idx_feedback_forms_portal ON feedback_forms(portal)`);
      console.log('✅ Index idx_feedback_forms_portal created on feedback_forms(portal).');
    }

    console.log('\n====================================================');
    console.log('🎉 ALL ADDITIVE MIGRATION STEPS APPLIED SUCCESSFULLY');
    console.log('====================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ MIGRATION FAILED:', err);
    process.exit(1);
  }
}

runMigration();
