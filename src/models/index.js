'use strict';
const fs = require('fs');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');

const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'production';
const cfgAll = require('../config/config');   // <— dùng config.js (KHÔNG phải config.json)
const cfg = cfgAll[env];
if (!cfg) throw new Error(`No Sequelize config for env "${env}"`);

const sequelize = new Sequelize(
  cfg.database, cfg.username, cfg.password, {
    host: cfg.host, port: cfg.port, dialect: cfg.dialect,
    logging: cfg.logging, dialectOptions: cfg.dialectOptions
  }
);

// Tự động load mọi model *.js trong thư mục này (trừ index.js)
const db = {};
fs.readdirSync(__dirname)
  .filter(f => f !== basename && f.endsWith('.js'))
  .forEach(f => {
    const model = require(path.join(__dirname, f))(sequelize, DataTypes);
    db[model.name] = model;
  });

// Gọi associate nếu có định nghĩa
Object.keys(db).forEach(name => {
  if (typeof db[name].associate === 'function') db[name].associate(db);
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;
module.exports = db;
