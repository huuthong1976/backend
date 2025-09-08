// db.js
const mysql = require('mysql2/promise');
require('dotenv').config();

const pick = (...vals) => vals.find(v =>
  v !== undefined && v !== null && v !== '' && v !== 'undefined' && v !== 'null'
);

const HOST = pick(process.env.MYSQLHOST, process.env.DB_HOST, '127.0.0.1');
const PORT = Number(pick(process.env.MYSQLPORT, process.env.DB_PORT, 3306));
const USER = pick(process.env.MYSQLUSER, process.env.DB_USER, 'root');
const PASS = pick(process.env.MYSQLPASSWORD, process.env.DB_PASSWORD, '');
const NAME = pick(process.env.MYSQLDATABASE, process.env.DB_DATABASE, 'railway');

const pool = mysql.createPool({
  host: HOST,
  port: PORT,
  user: USER,
  password: PASS,
  database: NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // dùng SSL chỉ khi bạn kết nối qua proxy public; nội bộ *.railway.internal thì không cần
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
});

(async () => {
  try {
    const c = await pool.getConnection();
    console.log('>>> DB connected to', HOST + ':' + PORT, 'db=', NAME);
    c.release();
  } catch (e) {
    console.error('!!! DB CONNECTION ERROR !!!', e.code, e.message, 'host=', HOST);
  }
})();

module.exports = pool;
