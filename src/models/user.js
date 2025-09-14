// server/models/user.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // tuỳ bạn có dùng các quan hệ này hay không
      if (models.Timesheet) {
        this.hasMany(models.Timesheet, { foreignKey: 'user_id', as: 'timesheets' });
      }
      if (models.Company) {
        this.belongsTo(models.Company, { foreignKey: 'company_id', as: 'company' });
      }
    }
  }

  User.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    username: { type: DataTypes.STRING(100) },
    full_name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },

    // Map mật khẩu tới cột password_hash
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'password_hash'
    },

    role: { type: DataTypes.STRING, allowNull: false },
    company_id: { type: DataTypes.INTEGER },
    employee_code: { type: DataTypes.STRING, unique: true },
    position_id: { type: DataTypes.INTEGER },

    // cột hệ thống
    updated_at: { type: DataTypes.DATE },
    deleted_at: { type: DataTypes.DATE },
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'employees',
    underscored: true,

    // Bảng KHÔNG có created_at
    timestamps: true,
    createdAt: false,
    updatedAt: 'updated_at',

    // Soft delete qua deleted_at
    paranoid: true,
    deletedAt: 'deleted_at',
  });

  return User;
};
