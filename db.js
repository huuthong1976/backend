
const mysql = require('mysql2/promise');
require('dotenv').config();

const parseMysqlUrl = (dsn) => {
  try {
    if (!dsn) return null;
    const u = new URL(dsn);
    return {
      host: u.hostname,
      port: Number(u.port || 3306),
      user: decodeURIComponent(u.username || ''),
      password: decodeURIComponent(u.password || ''),
      database: (u.pathname || '').replace(/^\//, ''),
    };
  } catch { return null; }
};

const nonEmpty = (v) => v!==undefined && v!==null && v!=='' && v!=='undefined' && v!=='null';
const cfgFromUrl = parseMysqlUrl(process.env.MYSQL_URL) || parseMysqlUrl(process.env.MYSQL_PUBLIC_URL);
const pick = (...vals) => vals.find(nonEmpty);

const HOST = pick(cfgFromUrl?.host, process.env.MYSQLHOST, process.env.DB_HOST, '127.0.0.1');
const PORT = Number(pick(cfgFromUrl?.port, process.env.MYSQLPORT, process.env.DB_PORT, 3306));
const USER = pick(cfgFromUrl?.user, process.env.MYSQLUSER, process.env.DB_USER, 'root');
const PASS = pick(process.env.MYSQL_ROOT_PASSWORD, cfgFromUrl?.password, process.env.DB_PASSWORD, '');
const NAME = pick(cfgFromUrl?.database, process.env.MYSQLDATABASE, process.env.DB_DATABASE, 'railway');

const isInternal = String(HOST).endsWith('.railway.internal');
const SSL = !isInternal && (process.env.DB_SSL === 'true' || process.env.MYSQL_PUBLIC_URL) ? { rejectUnauthorized: true } : undefined;

const pool = mysql.createPool({ host: HOST, port: PORT, user: USER, password: PASS, database: NAME, waitForConnections: true, connectionLimit: 10, queueLimit: 0, ssl: SSL });

(async () => {
  try { const c = await pool.getConnection(); console.log('>>> DB connected to', `${HOST}:${PORT}`, 'db=', NAME, 'ssl=', !!SSL); c.release(); }
  catch (e) { console.error('!!! DB CONNECTION ERROR !!!', e.code, e.message, 'host=', HOST, 'port=', PORT); }
})();

module.exports = pool;

