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

  return Position;
};
