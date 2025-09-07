// models/companyKpiMonthlySummary.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CompanyKpiMonthlySummary extends Model {
    static associate(models) {
      // định nghĩa các association nếu có
      this.belongsTo(models.Company, { foreignKey: 'company_id' });
    }
  }
  CompanyKpiMonthlySummary.init({
    company_id: DataTypes.INTEGER,
    year: DataTypes.INTEGER,
    month: DataTypes.INTEGER,
    total_score: DataTypes.DECIMAL(10, 2)
  }, {
    sequelize,
    modelName: 'CompanyKpiMonthlySummary', // Tên này rất quan trọng
    tableName: 'company_kpi_monthly_summary' // Tên bảng trong database
  });
  return CompanyKpiMonthlySummary;
};