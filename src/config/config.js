// src/config/config.js
const sslOn = process.env.DB_SSL === 'true';

const base = {
  username: process.env.MYSQLUSER || process.env.DB_USER || 'root',
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.MYSQLDATABASE || process.env.DB_DATABASE || 'railway',
  host:     process.env.MYSQLHOST || process.env.DB_HOST || '127.0.0.1',
  port:     Number(process.env.MYSQLPORT || process.env.DB_PORT || 3306),
  dialect:  'mysql',
  logging:  false,
  dialectOptions: sslOn ? { ssl: { rejectUnauthorized: true } } : {}
};

module.exports = {
  development: { ...base },
  test:        { ...base },
  production:  { ...base }
};
