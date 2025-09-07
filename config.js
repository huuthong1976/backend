// config.js  (Sequelize)
require('dotenv').config();

// Map biến ENV của Railway sang tên quen thuộc (nếu bạn dùng DB_* ở chỗ khác)
process.env.DB_HOST     = process.env.DB_HOST     || process.env.MYSQLHOST;
process.env.DB_PORT     = process.env.DB_PORT     || process.env.MYSQLPORT;
process.env.DB_USER     = process.env.DB_USER     || process.env.MYSQLUSER;
process.env.DB_PASSWORD = process.env.DB_PASSWORD || process.env.MYSQLPASSWORD;
process.env.DB_DATABASE = process.env.DB_DATABASE || process.env.MYSQLDATABASE;

const base = {
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  host:     process.env.DB_HOST,
  port:     Number(process.env.DB_PORT || 3306),
  dialect:  'mysql',
  logging:  false,
  dialectOptions: {}
};

// Nếu DB yêu cầu SSL, đặt DB_SSL=true trong Variables của Railway
if (process.env.DB_SSL === 'true') {
  base.dialectOptions.ssl = { rejectUnauthorized: true };
}

module.exports = {
  development: {
    ...base,
    // local dev fallback:
    host: process.env.DB_HOST || '127.0.0.1'
  },
  production: {
    ...base
  },
  test: {
    ...base
  }
};
