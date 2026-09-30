const bcrypt = require('bcrypt');
require('dotenv').config();
const { pool } = require('../config/db');

async function fixDemoPasswords() {
  try {
    const hash = await bcrypt.hash('password123', 10);
    console.log('Generated fresh hash:', hash);
    const [result] = await pool.execute(
      'UPDATE users SET password_hash = ? WHERE email IN (?, ?, ?)',
      [hash, 'student@demo.com', 'hod@demo.com', 'management@demo.com']
    );
    console.log('Updated rows:', result.affectedRows);
    process.exit(0);
  } catch (err) {
    console.error('Error updating demo passwords:', err);
    process.exit(1);
  }
}

fixDemoPasswords();
