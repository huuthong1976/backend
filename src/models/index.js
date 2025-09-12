'use strict';

const fs = require('fs');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');

const basename = path.basename(__filename);

// Dùng production trên Railway (nếu không set thì mặc định 'production')
const env = process.env.NODE_ENV || 'production';

// LẤY CẤU HÌNH TỪ config.js (không phải config.json)
const cfgAll = require('../config/config');      // <-- file JS của bạn
const cfg = cfgAll[env];

if (!cfg) {
  throw new Error(`Sequelize config for env "${env}" not found in src/config/config.js`);
}

// Khởi tạo Sequelize từ config.js
const sequelize = new Sequelize(
  cfg.database,
  cfg.username,
  cfg.password,
  {
    host: cfg.host,
    port: cfg.port,
    dialect: cfg.dialect || 'mysql',
    logging: cfg.logging ?? false,
    dialectOptions: cfg.dialectOptions || undefined, // SSL nếu bạn có cấu hình
  }
);

// Tự động nạp tất cả model *.js trong thư mục này
const db = {};
fs.readdirSync(__dirname)
  .filter(
    (file) =>
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js'
  )
  .forEach((file) => {
    const model = require(path.join(__dirname, file))(sequelize, DataTypes);
    db[model.name] = model;
  });

// Gọi associate nếu model có định nghĩa
Object.keys(db).forEach((name) => {
  if (typeof db[name].associate === 'function') {
    db[name].associate(db);
  }
});

// Export
db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
