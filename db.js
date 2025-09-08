// db.js
const mysql = require('mysql2/promise');
require('dotenv').config();

// Map biến ENV của Railway sang DB_*
const HOST = process.env.DB_HOST     || process.env.MYSQLHOST || 'maglev.proxy.rlwy.net';
const PORT = Number(process.env.DB_PORT || process.env.MYSQLPORT || 55476);
const USER = process.env.DB_USER     || process.env.MYSQLUSER  || 'root';
const PASS = process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || 'czUkgoEBOxGnkrcJfRcvSkrJaFIpNzMP';
const NAME = process.env.DB_DATABASE || process.env.MYSQLDATABASE || 'railway';

const pool = mysql.createPool({
  host: HOST,
  port: PORT,
  user: USER,
  password: PASS,
  database: NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Bật khi DB yêu cầu SSL: đặt DB_SSL=true trong Railway Variables
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined
});

// Kiểm tra kết nối (mysql2/promise dùng async/await, KHÔNG dùng callback)
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log('>>> Kết nối CSDL thành công!');
    conn.release();
  } catch (err) {
    console.error('!!! LỖI KẾT NỐI CSDL !!!', err.code, err.message);
  }
})();

module.exports = pool;
