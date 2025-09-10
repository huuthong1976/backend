// src/models/index.js (CommonJS)
'use strict';

const fs = require('fs');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');

// NÊN nạp .env ở đây (trước khi dùng config):
require('dotenv').config({
  path: process.env.DOTENV_PATH || path.join(process.cwd(), '.env')
});

const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';

let dbConfig;

// Ưu tiên config.js, sau đó config.json
const configJsPath = path.join(__dirname, '..', 'config', 'config.js');
const configJsonPath = path.join(__dirname, '..', 'config', 'config.json');

if (fs.existsSync(configJsPath)) {
  const all = require(configJsPath);
  dbConfig = all[env];
} else if (fs.existsSync(configJsonPath)) {
  const all = require(configJsonPath);
  dbConfig = all[env];
} else {
  dbConfig = null;
}

if (!dbConfig) {
  throw new Error(
    `Không tìm thấy cấu hình DB cho NODE_ENV="${env}". Hãy tạo src/config/config.js (hoặc .json) và export theo môi trường.`
  );
}

let sequelize;
if (dbConfig.use_env_variable) {
  const url = process.env[dbConfig.use_env_variable];
  if (!url) {
    throw new Error(
      `use_env_variable="${dbConfig.use_env_variable}" nhưng biến môi trường chưa có.`
    );
  }
  sequelize = new Sequelize(url, dbConfig);
} else {
  sequelize = new Sequelize(
    dbConfig.database,
    dbConfig.username,
    dbConfig.password,
    dbConfig
  );
}

const db = {};

// Auto-import tất cả model *.js (trừ index.js)
fs
  .readdirSync(__dirname)
  .filter((file) =>
    file.indexOf('.') !== 0 &&
    file !== basename &&
    file.slice(-3) === '.js'
  )
  .forEach((file) => {
    const model = require(path.join(__dirname, file))(sequelize, DataTypes);
    db[model.name] = model;
  });

// Gọi associate nếu có
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
