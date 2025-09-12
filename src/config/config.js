// src/config/config.js
const base = {
  username: process.env.MYSQLUSER     || process.env.DB_USER     || 'root',
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.MYSQLDATABASE || process.env.DB_DATABASE || 'railway',
  host:     process.env.MYSQLHOST     || process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.MYSQLPORT || process.env.DB_PORT || 3306),
  dialect:  'mysql',
  logging:  false,
};


const sslMode = process.env.DB_SSL; // 'strict'|'relaxed'|undefined
const dialectOptions =
  sslMode === 'strict'  ? { ssl: { rejectUnauthorized: true  } } :
  sslMode === 'relaxed' ? { ssl: { rejectUnauthorized: false } } :
  undefined;

module.exports = {
  development: { ...base, dialectOptions },
  test:        { ...base, dialectOptions },
  production:  { ...base, dialectOptions },
};
