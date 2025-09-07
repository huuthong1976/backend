// server/models/kpiitem.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class KpiItem extends Model {
    /**
     * ✅ BỔ SUNG PHƯƠNG THỨC NÀY
     */
    static associate(models) {
      // Một Mục tiêu (Item) thuộc về một Kế hoạch (Plan)
      this.belongsTo(models.EmployeeWorkPlan, {
        foreignKey: 'employee_work_plan_id' // Tên cột khóa ngoại
      });
    }
  }
  KpiItem.init({
    // ... các trường dữ liệu của bạn ...
    kpi_name: DataTypes.STRING,
    weight_percentage: DataTypes.DECIMAL,
    employee_work_plan_id: DataTypes.INTEGER, // Khóa ngoại
  }, {
    sequelize,
    modelName: 'KpiItem',
    tableName: 'employee_work_plans' // Chỉ định rõ tên bảng nếu cần
  });
  return KpiItem;
};