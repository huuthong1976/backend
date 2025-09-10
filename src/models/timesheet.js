'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Timesheet extends Model {
    /**
     * A Timesheet entry belongs to a User.
     */
    static associate(models) {
      this.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
    }
  }
  
  Timesheet.init({
    // Foreign key for the User
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    // Check-in and Check-out times
    check_in: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    check_out: {
      type: DataTypes.DATE,
      allowNull: true, // Can be null if the user is still working
    },
    // Additional details shown in the UI
    status: {
      type: DataTypes.STRING, // e.g., 'Completed', 'In Progress'
    },
    device_type: {
      type: DataTypes.STRING, // e.g., 'Web', 'Mobile'
    },
    ip_address: {
      type: DataTypes.STRING,
    },
    // You can add more fields as needed
  }, {
    sequelize,
    // The modelName must be 'Timesheet'
    modelName: 'Timesheet',
    tableName: 'timesheets', // The actual table name in your database
    timestamps: true,
    underscored: true,
  });

  return Timesheet;
};