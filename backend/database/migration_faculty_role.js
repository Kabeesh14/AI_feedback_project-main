const { pool } = require('../config/db');

async function migrate() {
  console.log('--- Applying approved schema change for users.role ---');
  try {
    const [cols] = await pool.query("SHOW COLUMNS FROM users WHERE Field = 'role'");
    console.log('Current role column definition:', cols[0]);

    await pool.query(
      "ALTER TABLE users MODIFY COLUMN role ENUM('student', 'faculty', 'hod', 'management') NOT NULL"
    );

    const [updatedCols] = await pool.query("SHOW COLUMNS FROM users WHERE Field = 'role'");
    console.log('Updated role column definition:', updatedCols[0]);
    console.log('✅ Schema successfully updated: users.role expanded to include faculty.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Schema update failed:', err);
    process.exit(1);
  }
}

migrate();
