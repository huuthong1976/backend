// server/models/companykpiregistration.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CompanyKpiRegistration extends Model {
    static associate(models) {
      // ... các association của bạn ...
      this.belongsTo(models.KpiLibrary, {
        foreignKey: 'kpi_id',
        as: 'kpiDetail'
      });
      this.hasMany(models.CompanyKpiMonthly, { foreignKey: 'registration_id', as: 'monthlyAllocations' });
    }
    
    

  }
  CompanyKpiRegistration.init({
    // Các trường dữ liệu khớp với bảng của bạn
    company_id: DataTypes.INTEGER,
    kpi_id: DataTypes.INTEGER,
    year: DataTypes.INTEGER,
    target_value: DataTypes.DECIMAL(18, 2),
    weight: DataTypes.DECIMAL(5, 2),
    parent_registration_id: DataTypes.INTEGER,
    created_by: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'CompanyKpiRegistration',
    tableName: 'company_kpi_registration',
    // ✅ VÔ HIỆU HÓA TIMESTAMPS VÌ BẢNG KHÔNG CÓ CÁC CỘT NÀY
    timestamps: false, 
    underscored: true 
  });
  return CompanyKpiRegistration;
};