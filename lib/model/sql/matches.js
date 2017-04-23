/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('matches', {
    id: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    region: {
      type: DataTypes.STRING(4),
      allowNull: false
    },
    winner: {
      type: DataTypes.ENUM('100','200'),
      allowNull: false
    },
    queue: {
      type: DataTypes.STRING(45),
      allowNull: false
    },
    map: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false
    },
    patch: {
      type: DataTypes.STRING(15),
      allowNull: false
    },
    creation: {
      type: DataTypes.DATE,
      allowNull: false
    },
    duration: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false
    }
  }, {
    tableName: 'matches'
  });
};
