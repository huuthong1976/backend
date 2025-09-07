// server/models/companyKpiMonthly.js
'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class CompanyKpiMonthly extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Định nghĩa các mối quan hệ ở đây
      // Ví dụ: một bản ghi tháng sẽ thuộc về một đăng ký KPI của năm
      this.belongsTo(models.CompanyKpiRegistration, {
        foreignKey: 'registration_id',
        as: 'registration'
      });
    }
    
  }
  CompanyKpiMonthly.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false
    },
    registration_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'company_kpi_registration', // Tên bảng mà nó tham chiếu đến
        key: 'id'
      }
    },
    month: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    target_value: {
      type: DataTypes.DECIMAL(18, 2)
    },
    actual_value: {
      type: DataTypes.DECIMAL(18, 2)
    },
    completion_rate: {
      type: DataTypes.DECIMAL(5, 2)
    },
    score: {
      type: DataTypes.DECIMAL(5, 2)
    }
  }, {
    sequelize,
    modelName: 'CompanyKpiMonthly',
    tableName: 'company_kpi_monthly',
    timestamps: false, // Vô hiệu hóa timestamps nếu bảng không có cột createdAt và updatedAt
    underscored: true, // Tự động chuyển đổi camelCase thành snake_case
  });
  return CompanyKpiMonthly;
};