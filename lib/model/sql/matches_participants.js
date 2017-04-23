/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('matches_participants', {
    id: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    match_id: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      references: {
        model: 'matches',
        key: 'id'
      }
    },
    team_id: {
      type: DataTypes.ENUM('100','200'),
      allowNull: false
    },
    summoner_id: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('?','TOP','JUNGLE','MID','CARRY','SUPPORT'),
      allowNull: false
    },
    champion_id: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false
    },
    kills: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false
    },
    deaths: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false
    },
    assists: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false
    },
    cs: {
      type: DataTypes.INTEGER(11).UNSIGNED,
      allowNull: false
    },
    first_blood: {
      type: DataTypes.INTEGER(3).UNSIGNED,
      allowNull: false
    },
    first_tower: {
      type: DataTypes.INTEGER(3).UNSIGNED,
      allowNull: false
    },
    largest_kills: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false
    },
    largest_spree: {
      type: DataTypes.INTEGER(11).UNSIGNED,
      allowNull: false
    },
    spell_d: {
      type: DataTypes.INTEGER(11).UNSIGNED,
      allowNull: false
    },
    spell_f: {
      type: DataTypes.INTEGER(11).UNSIGNED,
      allowNull: false
    },
    item_0: {
      type: DataTypes.INTEGER(11).UNSIGNED,
      allowNull: false
    },
    item_1: {
      type: DataTypes.INTEGER(11).UNSIGNED,
      allowNull: false
    },
    item_2: {
      type: DataTypes.INTEGER(11).UNSIGNED,
      allowNull: false
    },
    item_3: {
      type: DataTypes.INTEGER(11).UNSIGNED,
      allowNull: false
    },
    item_4: {
      type: DataTypes.INTEGER(11).UNSIGNED,
      allowNull: false
    },
    item_5: {
      type: DataTypes.INTEGER(11).UNSIGNED,
      allowNull: false
    },
    item_6: {
      type: DataTypes.INTEGER(11).UNSIGNED,
      allowNull: false
    },
    gold_0_10: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false
    },
    gold_0_20: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false
    },
    xp_0_10: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false
    },
    xp_0_20: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false
    },
    double_kills: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false
    },
    triple_kills: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false
    },
    quadra_kills: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false
    },
    penta_kills: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false
    }
  }, {
    tableName: 'matches_participants'
  });
};
