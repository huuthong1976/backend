// server/models/bscperspective.js
'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class BscPerspective extends Model {
    static associate(models) {
      this.hasMany(models.BscWeight, {
        foreignKey: 'perspective_id',
        as: 'weights'
      });
    }
  }
  BscPerspective.init({
    perspective_code: DataTypes.STRING,
    name: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'BscPerspective',
    tableName: 'bsc_perspectives',
    timestamps: false,
  });
  return BscPerspective;
};