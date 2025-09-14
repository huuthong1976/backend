'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Position extends Model {
    static associate(models) {}
  }
  Position.init({
    position_name: { type: DataTypes.STRING, allowNull: false }
  }, {
    sequelize,
    modelName: 'Position',
    tableName: 'positions',
    timestamps: false,
  });
  return Position;
};