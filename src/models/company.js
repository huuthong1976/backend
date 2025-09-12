// server/models/company.js
module.exports = (sequelize, DataTypes) => {
  const Company = sequelize.define('Company', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    company_code:   { type: DataTypes.STRING(50),  allowNull: true },
    company_name:   { type: DataTypes.STRING(255), allowNull: false }, // <-- tên công ty chuẩn
    address:        { type: DataTypes.TEXT,        allowNull: true },
    tax_code:       { type: DataTypes.STRING(50),  allowNull: true },
    phone:          { type: DataTypes.STRING(20),  allowNull: true },
    email:          { type: DataTypes.STRING(100), allowNull: true },

    created_at:       { type: DataTypes.DATE, allowNull: true },
    deleted_at:       { type: DataTypes.DATE, allowNull: true },
    deleted_by:       { type: DataTypes.INTEGER, allowNull: true },
    deleted_from_ip:  { type: DataTypes.STRING(45), allowNull: true },
    status:           { type: DataTypes.STRING(255), allowNull: true },
  }, {
    tableName: 'companies',
    timestamps: false,      // vì bảng chỉ có created_at, không có updated_at/createdAt mặc định
    paranoid: false,        // dùng cột deleted_at tự quản lý
    underscored: true,
  });

  return Company;
};
