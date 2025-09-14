// server/models/employee.js
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Employee extends Model {
    static associate(models) {
      // 1 nhân viên thuộc 1 chức danh
      this.belongsTo(models.Position, { foreignKey: 'position_id', as: 'position' });

      // Trưởng đơn vị có nhiều nhân viên
      this.hasMany(models.Employee, { foreignKey: 'manager_id', as: 'subordinates' });

      // Nhân viên có 1 quản lý
      this.belongsTo(models.Employee, { foreignKey: 'manager_id', as: 'manager' });

      // Nếu bạn có KpiPlan:
      if (models.KpiPlan) {
        this.hasMany(models.KpiPlan, { foreignKey: 'employee_id', as: 'kpi_plans' });
      }
    }
  }

  Employee.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

      // Các cột đăng nhập & phân quyền
      username: { type: DataTypes.STRING(100), allowNull: true },
      password: {                                     // alias để tiện dùng trong controller
        type: DataTypes.STRING(255),
        field: 'password_hash',
        allowNull: true,
      },
      role: { type: DataTypes.STRING(50), allowNull: true },

      // Thông tin chung
      employee_code: { type: DataTypes.STRING(50), allowNull: true },
      full_name: { type: DataTypes.STRING(150), allowNull: true },
      email: { type: DataTypes.STRING(100), allowNull: true },
      phone: { type: DataTypes.STRING(20), allowNull: true },
      gender: { type: DataTypes.ENUM('Nam', 'Nữ', 'Khác'), allowNull: true },
      dob: { type: DataTypes.DATEONLY, allowNull: true },

      // Quan hệ tổ chức
      department_id: { type: DataTypes.INTEGER, allowNull: true },
      company_id: { type: DataTypes.INTEGER, allowNull: true },
      position_id: { type: DataTypes.INTEGER, allowNull: true },
      manager_id: { type: DataTypes.INTEGER, allowNull: true },

      // Trạng thái & hồ sơ
      status: { type: DataTypes.ENUM('Đang làm việc', 'Đã nghỉ việc'), allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, allowNull: true },
      avatar_url: { type: DataTypes.STRING(255), allowNull: true },

      // Lương & BH
      base_salary_for_insurance: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
      performance_salary_base: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
      total_salary: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
      p2_salary: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
      num_dependents: { type: DataTypes.INTEGER, allowNull: true },
      union_fee: { type: DataTypes.DECIMAL(18, 2), allowNull: true },

      // 2FA & OAuth
      two_factor_enabled: { type: DataTypes.BOOLEAN, allowNull: true },
      two_factor_secret: { type: DataTypes.TEXT, allowNull: true },
      two_factor_backup_codes: { type: DataTypes.TEXT, allowNull: true },
      google_id: { type: DataTypes.STRING(255), allowNull: true },

      // Nhật ký
      last_login: { type: DataTypes.DATE, allowNull: true },
      login_count: { type: DataTypes.INTEGER, allowNull: true },
      password_updated_at: { type: DataTypes.DATE, allowNull: true },

      // Soft delete
      deleted_at: { type: DataTypes.DATE, allowNull: true },
      deleted_by: { type: DataTypes.INTEGER, allowNull: true },
      deleted_from_ip: { type: DataTypes.STRING(45), allowNull: true },

      // Chỉ có updated_at (snake_case)
      updated_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'Employee',
      tableName: 'employees',

      // Bảng không có created_at → tắt createdAt, map updatedAt
      timestamps: true,
      createdAt: false,
      updatedAt: 'updated_at',

      // Bảng có deleted_at → bật paranoid để Sequelize tôn trọng soft-delete
      paranoid: true,
      deletedAt: 'deleted_at',

      // Cột snake_case
      underscored: true,

      // (khuyến nghị) Index cho đăng nhập nhanh
      indexes: [
        { fields: ['username'] },
        { fields: ['company_id'] },
      ],
    }
  );

  return Employee;
};
