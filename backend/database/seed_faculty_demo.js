const bcrypt = require('bcrypt');
require('dotenv').config();
const { pool } = require('../config/db');

async function seedFacultyDemo() {
  try {
    const email = 'faculty@demo.com';
    const name = 'Dr. Ananya Sharma';
    const role = 'faculty';
    const department = 'Artificial Intelligence & Data Science';
    const departmentId = 5;

    // Check if already exists
    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      console.log(`Faculty demo user already exists with ID: ${existing[0].id}`);
      process.exit(0);
    }

    const passwordHash = await bcrypt.hash('password123', 10);

    const [result] = await pool.execute(
      `INSERT INTO users (name, email, password_hash, role, department, department_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, email, passwordHash, role, department, departmentId]
    );

    console.log(`Successfully created Faculty demo account with ID: ${result.insertId}`);
    
    // Verify record
    const [rows] = await pool.execute('SELECT id, name, email, role, department, department_id, created_at FROM users WHERE id = ?', [result.insertId]);
    console.log('Verified user record:', rows[0]);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding faculty demo account:', error);
    process.exit(1);
  }
}

seedFacultyDemo();
