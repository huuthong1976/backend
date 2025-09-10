'use strict';
module.exports = (sequelize, DataTypes) => {
  const Position = sequelize.define('Position', {
    // Khóa chính, tự động tăng
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    // Tên chức vụ
    position_name: {
      type: DataTypes.STRING,
      allowNull: false 
    }
  }, {
    
    timestamps: false,
   
    tableName: 'positions'
  });

  return Position;
};
