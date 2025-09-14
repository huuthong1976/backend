const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'Thong7690@',
  database: process.env.MYSQL_DB || 'bsc_kpi',
  decimalNumbers: true, 
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Kiểm tra kết nối (không gây vòng lặp)
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log('>>> DB connected');
    conn.release();
  } catch (err) {
    console.error('DB connection error:', err.code || err.message || err);
  }
})();

function getPool() { return pool; }

module.exports = { pool, getPool };
