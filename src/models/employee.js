const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Employee extends Model {
    static associate(models) {
      // Các quan hệ bạn đã có
      if (models.Position) {
        this.belongsTo(models.Position, { foreignKey: 'position_id', as: 'position' });
      }
      this.hasMany(models.Employee, { foreignKey: 'manager_id', as: 'subordinates' });
      this.belongsTo(models.Employee, { foreignKey: 'manager_id', as: 'manager' });

      if (models.KpiPlan) {
        this.hasMany(models.KpiPlan, { foreignKey: 'employee_id', as: 'kpi_plans' });
      }
      // (tùy chọn) nếu có Department/Company models
      if (models.Department) {
        this.belongsTo(models.Department, { foreignKey: 'department_id', as: 'department' });
      }
      if (models.Company) {
        this.belongsTo(models.Company, { foreignKey: 'company_id', as: 'company' });
      }
    }
  }

  Employee.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

      employeeCode: { type: DataTypes.STRING(50), field: 'employee_code' },
      fullName: { type: DataTypes.STRING(150), field: 'full_name', allowNull: false },

      gender: { type: DataTypes.ENUM('Nam', 'Nữ', 'Khác') },
      dob: { type: DataTypes.DATEONLY },

      email: { type: DataTypes.STRING(100) },
      phone: { type: DataTypes.STRING(20) },

      departmentId: { type: DataTypes.INTEGER, field: 'department_id' },
      companyId: { type: DataTypes.INTEGER, field: 'company_id', allowNull: false },
      positionId: { type: DataTypes.INTEGER, field: 'position_id' },
      managerId: { type: DataTypes.INTEGER, field: 'manager_id' },

      startDate: { type: DataTypes.DATEONLY, field: 'start_date' },
      status: { type: DataTypes.ENUM('Đang làm việc', 'Đã nghỉ việc') },

      username: { type: DataTypes.STRING(100) },

      // QUAN TRỌNG cho đăng nhập:
      passwordHash: { type: DataTypes.STRING(255), field: 'password_hash' },

      role: {
        type: DataTypes.ENUM(
          'Admin', 'TongGiamDoc', 'TruongDonVi', 'Truongphong',
          'NhanVienCM', 'NhanVienKD', 'NhanVienPT', 'KeToan',
          'NhanSu', 'PhoDV', 'Phophong'
        )
      },

      isActive: { type: DataTypes.BOOLEAN, field: 'is_active' },
      avatarUrl: { type: DataTypes.STRING(255), field: 'avatar_url' },

      baseSalaryForInsurance: { type: DataTypes.DECIMAL(18, 2), field: 'base_salary_for_insurance' },
      performanceSalaryBase: { type: DataTypes.DECIMAL(18, 2), field: 'performance_salary_base' },
      totalSalary: { type: DataTypes.DECIMAL(18, 2), field: 'total_salary' },
      p2Salary: { type: DataTypes.DECIMAL(18, 2), field: 'p2_salary' },

      numDependents: { type: DataTypes.INTEGER, field: 'num_dependents' },
      unionFee: { type: DataTypes.DECIMAL(18, 2), field: 'union_fee' },

      deletedAt: { type: DataTypes.DATE, field: 'deleted_at' },
      deletedBy: { type: DataTypes.INTEGER, field: 'deleted_by' },
      deletedFromIp: { type: DataTypes.STRING(45), field: 'deleted_from_ip' },

      twoFactorEnabled: { type: DataTypes.BOOLEAN, field: 'two_factor_enabled' },
      twoFactorSecret: { type: DataTypes.TEXT, field: 'two_factor_secret' },
      twoFactorBackupCodes: { type: DataTypes.TEXT, field: 'two_factor_backup_codes' },

      googleId: { type: DataTypes.STRING(255), field: 'google_id' },

      lastLogin: { type: DataTypes.DATE, field: 'last_login' },
      loginCount: { type: DataTypes.INTEGER, field: 'login_count' },

      passwordUpdatedAt: { type: DataTypes.DATE, field: 'password_updated_at' },
      updatedAt: { type: DataTypes.DATE, field: 'updated_at' }
    },
    {
      sequelize,
      modelName: 'Employee',
      tableName: 'employees',
      timestamps: false,              // bảng không dùng created_at/updated_at mặc định
      defaultScope: {
        // tránh trả về các secret nhạy cảm mặc định
        attributes: { exclude: ['passwordHash', 'twoFactorSecret', 'twoFactorBackupCodes'] }
      },
      scopes: {
        withSecret: {},               // dùng khi cần lấy passwordHash/2FA
        active: { where: { isActive: true, deletedAt: null } }
      },
      indexes: [
        { fields: ['username'] },
        { fields: ['email'] },
        { fields: ['company_id'] }
      ]
    }
  );

  return Employee;
};
