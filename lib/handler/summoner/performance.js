"use strict";

var async = require("async");
var log = require('debug')('teamward:handler:summoner-performance');
var summonerInfo = require('../../riot-api/summoner-info.js');
var gameInfo = require('../../riot-api/game-info.js');
var request = require('../../riot-api/request.js');

var ddragon = require('../../ddragon');


module.exports.get = function(req, res) {
  if(!req.query.champion) {
    res.status(409).send('Missing champion param!');
    return;
  }

  async.auto({
    getCurrentPatch: ddragon.currentPatch.bind(null, 'euw'),
    preloadChampionData: ['getCurrentPatch', function(res, cb) {
      // Pre-warm the cache!
      // Only happens once per worker
      async.series([
        ddragon.getChampionData.bind(this, 'euw', 420),
        ddragon.getItemData.bind(this, 'euw', 1055),
      ], cb);
    }],
    loadSummonerData: function loadSummonerData(cb) {
      summonerInfo.getSummonerData(req.query.summoner, req.query.region, function(err, data) {
        if(!data) {
          err = new Error("Summoner does not exist!");
          err.statusCode = 404;
        }

        cb(err, data);
      });
    },
    loadChampionData: ['preloadChampionData', function ensureValidChampion(res, cb) {
      ddragon.getChampionData('euw', req.query.champion, function(err, champion) {
        if(err) {
          err.statusCode = 404;
        }

        cb(err, champion);
      });
    }],
    loadNormalMatchHistory: ['loadSummonerData', 'loadChampionData', function(res, cb) {
      summonerInfo.getRecentMatches(res.loadSummonerData.id, req.query.region, cb);
    }],
    filterNormalMatchHistory: ['loadNormalMatchHistory', function(res, cb) {
      if(!res.loadNormalMatchHistory || !res.loadNormalMatchHistory.games) {
        var error = new Error("Issues with the Riot API :( [MISS_RECENT_DATA]");
        error.riotInternal = true;
        return cb(error);
      }

      // Only return relevant matches
      var interestingMatches = res.loadNormalMatchHistory.games.filter(function(item) {
        return item.championId === parseInt(res.loadChampionData.key);
      });

      cb(null, interestingMatches);
    }],
    loadRankedMatchHistory: ['loadSummonerData', 'loadChampionData', function(res, cb) {
      summonerInfo.getRecentRankedMatches(res.loadSummonerData.id, req.query.region, res.loadChampionData.key, cb);
    }],
    loadRankedMatches: ['loadRankedMatchHistory', function(res, cb) {
      async.map(res.loadRankedMatchHistory.matches, function(match, cb) {
        gameInfo.getExistingGame(match.matchId, req.query.region, cb);
      }, cb);
    }],
    reformatRankedMatches: ['loadRankedMatches', function(res, cb) {
      // Normalize "game" (normals) and "matches" (ranked) to look similar.
      var matches = res.loadRankedMatches.map(function(match) {
        // Find the player in the list of participants
        var player = match.participants.find(function(p) {
          return p.championId === parseInt(res.loadChampionData.key);
        });

        // Emulate a .stats object with the "game" conventions
        match.stats = player.stats || {};
        match.stats.win = match.stats.winner;
        match.stats.timePlayed = match.matchDuration;
        match.stats.championsKilled = player.stats.kills;
        match.stats.level = player.stats.champLevel;
        match.stats.numDeaths = player.stats.deaths;
        match.gameId = match.matchId;
        match.subType = match.queueType;
        match.createDate = match.matchCreation;
        return match;
      });

      cb(null, matches);
    }],
    mergeNormalAndRanked: ['loadNormalMatchHistory', 'reformatRankedMatches', function(res, cb) {
      var matches = [].concat(res.filterNormalMatchHistory, res.reformatRankedMatches);
      matches = matches.reduce(function(acc, m) {
        var gameDoesntExist = acc.every(function(m2) {
          return m.gameId !== m2.gameId;
        });
        if(gameDoesntExist) {
          acc.push(m);
        }

        return acc;
      }, []);

      matches.sort(function(m1, m2) {
        return m1.createDate < m2.createDate ? 1 : -1;
      });

      cb(null, matches);
    }],
    formatMatchHistory: ['mergeNormalAndRanked', function(res, cb) {
      var interestingMatches = res.mergeNormalAndRanked;

      // And format properly
      async.map(interestingMatches, function(match, cb) {
        // Why rito :(
        var items = [
          match.stats.item6,
          match.stats.item0,
          match.stats.item1,
          match.stats.item2,
          match.stats.item3,
          match.stats.item4,
          match.stats.item5,
        ];

        // Remove unused items
        items = items.filter(function(item) {
          return !!item;
        });

        // Properly format them
        items = async.map(items, function(itemId, cb) {
          ddragon.getItemData('euw', itemId, cb);
        }, function(err, items) {
          if(err) {
            return cb(err);
          }

          var firstItemIsTrinket = items[0] && items[0].gold.base === 0 && items[0].gold.sell === 0;

          items = items.map(function(item) {
            return {
              id: item.id,
              name: item.name,
              image_url: item.image_url,
              plaintext: item.plaintext,
            };
          });

          var ward;
          if(firstItemIsTrinket) {
            ward = items.shift();
          }

          // Sometimes, the ward is not detected as a ward, so we need to ensure we never send more than 6 items
          items = items.slice(0, 6);

          var matchUrl = "http://matchhistory.";
          matchUrl += req.query.region.toLowerCase();
          matchUrl += ".leagueoflegends.com/en/#match-details/";
          matchUrl += request.getPlatformFromRegion(req.query.region);
          // Known bug: this should be the account id, not the summoner id. Account ID is not available anymore :(
          matchUrl += "/" + match.gameId + "/" + res.loadSummonerData.id + "?tab=overview";

          var out = {
            id: match.gameId,
            match_url: matchUrl,
            level: match.stats.level,
            createDate: match.createDate,
            victory: match.stats.win,
            duration: match.stats.timePlayed,
            k: match.stats.championsKilled || 0,
            d: match.stats.numDeaths || 0,
            a: match.stats.assists || 0,
            cs: match.stats.minionsKilled,
            queue: match.subType === "NONE" ? match.gameType : match.subType,
            ward: ward,
            items: items
          };

          cb(null, out);
        });
      }, cb);
    }],
    sendData: ["formatMatchHistory", function(r, cb) {
      res.send({
        matches: r.formatMatchHistory
      });

      cb();
    }]
  },
  function(err) {
    if(err) {
      log(err);
      res.status(err.statusCode || 500).send(err.toString());
    }
  });

};
