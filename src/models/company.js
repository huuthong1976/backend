'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Company extends Model {
    static associate(models) {
      this.hasMany(models.BscWeight, { foreignKey: 'company_id', as: 'bscWeights' });
    }
  }
  
  Company.init({
    name: {
      type: DataTypes.STRING,
      field: 'company_name'
    },
    address: {
      type: DataTypes.STRING,
      field: 'address'
    },
  }, {
    sequelize,
    modelName: 'Company',
    tableName: 'companies',
    
    // ✅ FIX: Disable automatic timestamps for this model
    timestamps: false, 
    
    underscored: true,
  });

  return Company;
};