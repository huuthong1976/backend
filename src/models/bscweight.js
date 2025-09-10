'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BscWeight extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Defines the relationship: a Weight belongs to a Perspective
      this.belongsTo(models.BscPerspective, {
        foreignKey: 'perspective_id',
        as: 'perspective'
      });
      
      // ✅ ADD THIS LINE: Defines the relationship: a Weight also belongs to a Company
      this.belongsTo(models.Company, {
        foreignKey: 'company_id',
        as: 'company'
      });
    }
  }
  
  BscWeight.init({
    // Column definitions
    perspective_id: DataTypes.INTEGER,
    company_id: DataTypes.INTEGER,
    year: DataTypes.INTEGER,
    weight_percentage: DataTypes.DECIMAL(5, 2)
  }, {
    sequelize,
    modelName: 'BscWeight',
    tableName: 'bsc_weights',
    timestamps: true,
    underscored: true,
  });

  return BscWeight;
};