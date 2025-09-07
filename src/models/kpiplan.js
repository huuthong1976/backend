// server/models/kpiplan.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class KpiPlan extends Model {
    static associate(models) {
      this.belongsTo(models.Employee, {
        foreignKey: 'employee_id',
        as: 'employee'
      });
      this.hasMany(models.KpiPlanItem, {
        foreignKey: 'plan_id',
        as: 'items'
      });
    }
  }
  KpiPlan.init({
    employee_id: DataTypes.INTEGER,
    month: DataTypes.INTEGER,
    year: DataTypes.INTEGER,
    status: DataTypes.STRING,
    final_score: DataTypes.DECIMAL(5, 2),
    deleted_at: DataTypes.DATE, // ✅ Ensure deleted_at is defined here as well
  }, {
    sequelize,
    modelName: 'KpiPlan',
    tableName: 'kpi_plans',
    timestamps: true,
    underscored: true
  });
  return KpiPlan;
};