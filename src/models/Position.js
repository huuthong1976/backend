'use strict';

module.exports = (sequelize, DataTypes) => {
 
  const Position = sequelize.define('Position', {
   
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.STRING
    }
  });

  // You can define associations here as well
  Position.associate = (models) => { ... };

  return Position;
};
