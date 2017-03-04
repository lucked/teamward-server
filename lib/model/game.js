'use strict';

var mongoose = require('mongoose');

var GameSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
    unique: true,
  },
  mode: {
    type: String,
    required: true,
  },
  gType: {
    type: String,
    required: true
  },
  subType: {
    type: String,
    required: true
  },
  map: {
    type: Number,
    required: true
  },
  created: {
    type: Date,
    required: true
  },
  players: [{
    c: Number,
    t: Number,
    s: Number
  }]
}, {
  // Disable __v key.
  // We use mongo bulk update operations directly, so we don't need Mongoose here
  versionKey: false
});


GameSchema.statics.fromAPI = function fromAPI(apiGame, summonerId, region) {
  var prefix = region.toLowerCase() + ":";

  var game = {};
  game._id = prefix + apiGame.gameId;
  game.mode = apiGame.gameMode;
  game.gType = apiGame.gameType;
  game.subType = apiGame.subType;
  game.map = apiGame.mapId;
  game.created = new Date(apiGame.createDate);

  // Add first nine players
  game.players = (apiGame.fellowPlayers || []).map(function(player) {
    return {
      c: player.championId,
      t: player.teamId,
      s: player.summonerId
    };
  });

  // And original players
  game.players.push({
    c: apiGame.championId,
    t: apiGame.teamId,
    s: summonerId
  });

  return game;
};

// Save new premades data in an atomic way to mongo
// premades should be the output of the getPremades() function
GameSchema.statics.saveGamesToDB = function saveGamesToDB(playerGames, region, cb) {
  var Game = mongoose.model('Game');

  // Build all games
  var games = playerGames.reduce(function(acc, matchHistory) {
    if(matchHistory && matchHistory.games && matchHistory.games.length > 0) {
      acc = acc.concat(matchHistory.games.map(function(game) {
        return Game.fromAPI(game, matchHistory.summonerId, region);
      }));
    }
    return acc;
  }, []);

  if(games.length === 0) {
    process.nextTick(cb, null);
    return;
  }

  var bulk = mongoose.model('Game').collection.initializeUnorderedBulkOp();
  games.forEach(function(game) {
    bulk.insert(game);
  });

  // We DISCARD the error (E11000 -- duplicate key)
  bulk.execute(function() {
    cb();
  });
};

module.exports = mongoose.model("Game", GameSchema);
