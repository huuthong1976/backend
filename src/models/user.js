'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      this.hasMany(models.Timesheet, { foreignKey: 'user_id', as: 'timesheets' });
      this.belongsTo(models.Company, { foreignKey: 'company_id', as: 'company' });
    }
  }
  
  User.init({
    full_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    // ✅ FIX: Map the 'password' attribute to the 'password_hash' column
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'password_hash' 
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    company_id: {
      type: DataTypes.INTEGER,
    },
    // Add any other fields from your 'employees' table here
    employee_code: {
        type: DataTypes.STRING,
        unique: true
    },
    position_id: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'employees', // Your table is named 'employees'
    timestamps: true, // Assuming you have created_at/updated_at
    underscored: true,
  });

  return User;
};