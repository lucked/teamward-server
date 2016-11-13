"use strict";

var async = require("async");
var log = require('debug')('teamward:handler:summoner-performance');
var summonerInfo = require('../../riot-api/summoner-info.js');
var regionToPlatform = require('../../helper/region-to-platform.js');


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
    loadMatchHistory: ['loadSummonerData', 'loadChampionData', function(res, cb) {
      summonerInfo.getRecentMatches(res.loadSummonerData.id, req.query.region, cb);
    }],
    formatMatchHistory: ['loadMatchHistory', function(res, cb) {
      if(!res.loadMatchHistory || !res.loadMatchHistory.games) {
        var error = new Error("Issues with the Riot API :( [MISS_RECENT_DATA]");
        error.riotInternal = true;
        return cb(error);
      }

      // Only return relevant matches
      var interestingMatches = res.loadMatchHistory.games.filter(function(item) {
        return item.championId === parseInt(res.loadChampionData.key);
      });

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

          var firstItemIsTrinket = items[0].group === "RelicBase";

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
          matchUrl += regionToPlatform(req.query.region);
          // Known bug: this should be the account id, not the summoner id. Account ID is not available anymore :(
          matchUrl += "/" + match.gameId + "/" + res.loadSummonerData.id + "?tab=overview";

          var out = {
            id: match.gameId,
            match_url: matchUrl,
            victory: match.stats.win,
            duration: match.stats.timePlayed,
            k: match.stats.championsKilled,
            d: match.stats.numDeaths,
            a: match.stats.assists,
            cs: match.stats.minionsKilled,
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