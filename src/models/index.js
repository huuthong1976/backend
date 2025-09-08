// src/models/index.js
'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');

const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'production';

// lấy cấu hình từ src/config/config.js (đã viết theo ENV Railway)
const cfg = require(path.join(__dirname, '..', 'config', 'config.js'))[env];

// khởi tạo Sequelize instance
const sequelize = new Sequelize(cfg.database, cfg.username, cfg.password, cfg);

// nạp tất cả model .js trong thư mục này (trừ index.js)
const db = {};
fs.readdirSync(__dirname)
  .filter((file) => file !== basename && file.endsWith('.js'))
  .forEach((file) => {
    const model = require(path.join(__dirname, file))(sequelize, DataTypes);
    db[model.name] = model;
  });

// gọi associate nếu model có định nghĩa
Object.keys(db).forEach((name) => {
  if (typeof db[name].associate === 'function') {
    db[name].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
