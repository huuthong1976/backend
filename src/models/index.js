// src/models/index.js
'use strict';

const fs = require('fs');
const path = require('path');
const { DataTypes } = require('sequelize');
const sequelize = require('../src/config/db'); // dùng instance từ db.js
const basename = path.basename(__filename);

const db = {};

fs.readdirSync(__dirname)
  .filter((file) =>
    file.indexOf('.') !== 0 &&
    file !== basename &&
    file.endsWith('.js')
  )
  .forEach((file) => {
    const model = require(path.join(__dirname, file))(sequelize, DataTypes);
    db[model.name] = model;
  });

Object.keys(db).forEach((name) => {
  if (typeof db[name].associate === 'function') db[name].associate(db);
});

db.sequelize = sequelize;

module.exports = db;
