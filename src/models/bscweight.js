// server/models/bscweight.js
'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class BscWeight extends Model {
    static associate(models) {
      this.belongsTo(models.BscPerspective, {
        foreignKey: 'perspective_id',
        as: 'perspective'
      });
      // This is the line that was likely causing the original error if `Company` wasn't loaded
      this.belongsTo(models.Company, {
        foreignKey: 'company_id',
        as: 'company'
      });
    }
  }
  BscWeight.init({
    perspective_id: DataTypes.INTEGER,
    company_id: DataTypes.INTEGER,
    year: DataTypes.INTEGER,
    weight_percentage: DataTypes.DECIMAL(5, 2),
  }, {
    sequelize,
    modelName: 'BscWeight',
    tableName: 'bsc_weights',
    timestamps: true,
    underscored: true
  });
  return BscWeight;
};