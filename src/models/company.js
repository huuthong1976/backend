// server/models/company.js
'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Company extends Model {
    static associate(models) {
      // Associations can go here if the Company model needs them
      // For example: Company.hasMany(models.User);
    }
  }
  Company.init({
    company_name: DataTypes.STRING,
    // Add other fields you need for your Company model here
  }, {
    sequelize,
    modelName: 'Company',
    tableName: 'companies',
    timestamps: false,
    underscored: true
  });
  return Company;
};