'use strict';

module.exports = (sequelize, DataTypes) => {
  const Position = sequelize.define(
    'Position',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      name: { type: DataTypes.STRING(255), allowNull: false }
    },
    {
      tableName: 'positions',
      timestamps: true
    }
  );

  // Position.associate = (models) => { ... };

  return Position;
};
