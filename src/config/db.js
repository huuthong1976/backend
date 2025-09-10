// src/db.js
'use strict';
const path = require('path');
require('dotenv').config({
  path: process.env.DOTENV_PATH || path.join(process.cwd(), '.env')
});
const { Sequelize } = require('sequelize');
const configAll = require('./config/config');

const env = process.env.NODE_ENV || 'development';
const cfg = configAll[env];

let sequelize;
if (cfg.use_env_variable) {
  const url = process.env[cfg.use_env_variable];
  if (!url) throw new Error(`Thiếu biến môi trường ${cfg.use_env_variable}`);
  sequelize = new Sequelize(url, cfg);
} else {
  sequelize = new Sequelize(cfg.database, cfg.username, cfg.password, cfg);
}

module.exports = sequelize;
