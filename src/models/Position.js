const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Position extends Model {
    static associate(models) {
      // Một chức danh có nhiều nhân viên
      this.hasMany(models.Employee, {
        foreignKey: 'position_id',
        as: 'employees'
      });
    }
  }

  Position.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    position_name: {
      type: DataTypes.STRING,
      allowNull: false,
    }
  }, {
    sequelize,
    modelName: 'Position',
    tableName: 'positions',
    timestamps: false
  });

  return Position;
};
