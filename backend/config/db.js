const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from backend/.env and current working dir
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config();

// Create connection pool with sensible defaults and environment variables
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'feedbackiq_db',
  ssl: (process.env.DB_SSL === 'true' || process.env.DB_SSL === 'REQUIRED' || process.env.DB_SSL_MODE === 'REQUIRED')
    ? { rejectUnauthorized: false }
    : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

/**
 * Test the database connection safely
 * @returns {Promise<{connected: boolean, message: string, code?: string}>}
 */
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    return {
      connected: true,
      message: `Successfully connected to MySQL database "${process.env.DB_NAME || 'feedbackiq_db'}" at ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}`
    };
  } catch (error) {
    return {
      connected: false,
      message: `MySQL connection failed: ${error.message}`,
      code: error.code
    };
  }
}

module.exports = {
  pool,
  testConnection
};
