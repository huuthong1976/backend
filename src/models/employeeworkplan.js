// server/models/employeeworkplan.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class EmployeeWorkPlan extends Model {
    /**
     * ✅ BỔ SUNG PHƯƠNG THỨC NÀY
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index.js` file will call this method automatically.
     */
    static associate(models) {
      // Định nghĩa association ở đây
      // Một Kế hoạch (Plan) có nhiều Mục tiêu (Item)
      this.hasMany(models.KpiItem, {
        foreignKey: 'employee_work_plan_id', // Tên cột khóa ngoại trong bảng KpiItem
        as: 'items' // Bí danh này PHẢI KHỚP với 'as' trong lệnh include
      });
    }
  }
  EmployeeWorkPlan.init({
    // ... các trường dữ liệu của bạn ...
    employee_id: DataTypes.INTEGER,
    month: DataTypes.INTEGER,
    year: DataTypes.INTEGER,
    status: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'EmployeeWorkPlan',
    tableName: 'employee_work_plans',
    timestamps: true,
    underscored: true
  });
  return EmployeeWorkPlan;
};