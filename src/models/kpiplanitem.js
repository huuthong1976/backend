// server/models/kpiplanitem.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class KpiPlanItem extends Model {
    static associate(models) {
      this.belongsTo(models.KpiPlan, {
        foreignKey: 'plan_id',
        as: 'plan'
      });
    }
  }
  KpiPlanItem.init({
    plan_id: DataTypes.INTEGER,
    name: DataTypes.STRING,
    weight: DataTypes.DECIMAL(5, 2),
    result: DataTypes.TEXT,
    self_score: DataTypes.DECIMAL(5, 2),
    manager_score: DataTypes.DECIMAL(5, 2),
    director_score: DataTypes.DECIMAL(5, 2),
  }, {
    sequelize,
    modelName: 'KpiPlanItem',
    tableName: 'kpi_plan_items',
    timestamps: true,
    underscored: true
  });
  return KpiPlanItem;
};