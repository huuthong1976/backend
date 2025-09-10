
  // src/config/config.js
require('dotenv').config();

const common = {
  dialect: 'mysql',
  logging: false,
  // Pool ổn định hơn khi deploy
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
  timezone: '+07:00' // nếu muốn timestamps theo VN
};

const maybeSsl =
  process.env.DB_SSL === 'true'
    ? { dialectOptions: { ssl: { require: true, rejectUnauthorized: false } } }
    : {};

module.exports = {
  development: {
    ...common,
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || null,
    database: process.env.DB_NAME || 'app_dev',
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    ...maybeSsl
  },
  test: {
    ...common,
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || null,
    database: process.env.DB_NAME || 'app_test',
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    ...maybeSsl
  },
  production: {
    // Railway: dùng 1 biến URL là gọn nhất
    use_env_variable: 'mysql://root:czUkgoEBOxGnkrcJfRcvSkrJaFIpNzON@mysql-u2mk.railway.internal:3306/railway'
}',
    ...common,
    ...maybeSsl
  }
};
