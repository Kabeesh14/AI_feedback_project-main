const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function initDatabase() {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT, 10) || 3306;
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'feedbackiq_db';

  console.log(`[DB INIT] Connecting to MySQL at ${host}:${port} as user "${user}"...`);

  let connection;
  try {
    // Connect to server without database first to ensure CREATE DATABASE works
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      multipleStatements: true
    });

    console.log('[DB INIT] Connection established. Executing schema.sql...');
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    await connection.query(schemaSql);
    console.log('[DB INIT] Schema created/verified successfully.');

    console.log('[DB INIT] Executing seed.sql...');
    const seedSql = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf-8');
    await connection.query(seedSql);
    console.log('[DB INIT] Seed data inserted/updated successfully.');

    console.log(`[DB INIT] Database "${database}" is ready!`);
    await connection.end();
    process.exit(0);
  } catch (err) {
    console.error('[DB INIT ERROR]:', err.message);
    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\nNOTE: MySQL access was denied. Please ensure your actual MySQL root password is set in backend/.env:');
      console.error('DB_PASSWORD=YOUR_ACTUAL_MYSQL_PASSWORD\n');
    }
    if (connection) await connection.end().catch(() => {});
    process.exit(1);
  }
}

if (require.main === module) {
  initDatabase();
}

module.exports = { initDatabase };
