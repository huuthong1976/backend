// server/models/kpilibrary.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class KpiLibrary extends Model {
    static associate(models) {
      // Một KPI trong thư viện có thể được đăng ký nhiều lần
      this.hasMany(models.CompanyKpiRegistration, { foreignKey: 'kpi_id', as: 'registrations', });
      
      // Một KPI thuộc về một khía cạnh
      this.belongsTo(models.BscPerspective, { foreignKey: 'perspective_id', as: 'perspective' });

      // Tự liên kết để tạo cấu trúc cây
      this.belongsTo(models.KpiLibrary, { as: 'parent', foreignKey: 'parent_id' });
      this.hasMany(models.KpiLibrary, { as: 'children', foreignKey: 'parent_id' });
    }
  }
  KpiLibrary.init({
    // Các trường dữ liệu phải khớp với bảng kpi_library của bạn
    kpi_name: DataTypes.STRING,
    perspective_id: DataTypes.INTEGER,
    parent_id: DataTypes.INTEGER,
    unit: DataTypes.STRING,
    description: DataTypes.TEXT,
    type: DataTypes.ENUM('Định lượng', 'Định tính'),
    direction: DataTypes.ENUM('cao hơn tốt hơn', 'thấp hơn tốt hơn'),
    allowNull: false,
    defaultValue: 'cao hơn tốt hơn',
    company_id: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'KpiLibrary',
    tableName: 'kpi_library',
    
    // ✅ VÔ HIỆU HÓA TIMESTAMPS VÌ BẢNG KHÔNG CÓ CÁC CỘT NÀY
    timestamps: false,
  });
  return KpiLibrary;
};