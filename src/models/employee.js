const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Employee extends Model {
    static associate(models) {
      // Một nhân viên có thể thuộc một chức danh
      this.belongsTo(models.Position, {
        foreignKey: 'position_id',
        as: 'position'
      });
      
    
      // Một nhân viên có thể có nhiều KPI plans
      this.hasMany(models.KpiPlan, {
        foreignKey: 'employee_id',
        as: 'kpi_plans'
      });

      // Một nhân viên (Trưởng đơn vị) có thể quản lý nhiều nhân viên khác
      this.hasMany(models.Employee, {
        foreignKey: 'manager_id',
        as: 'subordinates'
      });

      // Một nhân viên có thể thuộc về một quản lý
      this.belongsTo(models.Employee, {
        foreignKey: 'manager_id',
        as: 'manager'
      });
    }
  }

  Employee.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    full_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    position_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    manager_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
    }
    // ... các trường khác trong bảng employees (email, phone, v.v.)
  }, {
    sequelize,
    modelName: 'Employee',
    tableName: 'employees',
    timestamps: false
  });

  return Employee;
};
