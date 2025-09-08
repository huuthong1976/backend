// db.js — mysql2/promise
const mysql = require('mysql2/promise');
require('dotenv').config();

// Ưu tiên biến của Railway; local thì dùng DB_* hoặc mặc định localhost
const HOST = process.env.MYSQLHOST || process.env.DB_HOST || '127.0.0.1';
const PORT = Number(process.env.MYSQLPORT || process.env.DB_PORT || 3306);
const USER = process.env.MYSQLUSER || process.env.DB_USER || 'root';
const PASS = process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '';
const NAME = process.env.MYSQLDATABASE || process.env.DB_DATABASE || 'railway';

const pool = mysql.createPool({
  host: HOST,
  port: PORT,
  user: USER,
  password: PASS,
  database: NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Railway nội bộ (*.railway.internal) không cần SSL; bật khi dùng public proxy
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
});

// Kiểm tra kết nối 1 lần khi khởi động
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log('>>> DB connected');
    conn.release();
  } catch (err) {
    console.error('!!! DB CONNECTION ERROR !!!', err.code, err.message);
  }
})();

module.exports = pool;
