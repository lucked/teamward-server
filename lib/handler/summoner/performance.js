"use strict";

var async = require("async");
var log = require('debug')('teamward:handler:summoner-performance');
var summonerInfo = require('../../riot-api/summoner-info-v3.js');
var gameInfo = require('../../riot-api/game-info-v3.js');
var request = require('../../riot-api/request.js');

var ddragon = require('../../ddragon');


module.exports.get = function(req, res) {
  if(!req.query.champion) {
    res.status(409).send('Missing champion param!');
    return;
  }

  async.auto({
    loadSummonerData: function loadSummonerData(cb) {
      summonerInfo.getSummonerData(req.query.summoner, req.query.region, function(err, data) {
        if(!data) {
          err = new Error("Summoner does not exist!");
          err.statusCode = 404;
        }

        cb(err, data);
      });
    },
    loadChampionData: function ensureValidChampion(cb) {
      ddragon.getChampionData('euw', req.query.champion, function(err, champion) {
        if(err) {
          err.statusCode = 404;
        }

        cb(err, champion);
      });
    },
    loadMatchHistory: ['loadSummonerData', 'loadChampionData', function(res, cb) {
      summonerInfo.getRecentRankedMatchesWithChampion(res.loadSummonerData.accountId, req.query.region, res.loadChampionData.key, cb);
    }],
    loadMatches: ['loadMatchHistory', function(res, cb) {
      async.map(res.loadMatchHistory.matches, function(match, cb) {
        gameInfo.getExistingGame(match.gameId, req.query.region, cb);
      }, cb);
    }],
    formatMatchHistory: ['loadSummonerData', 'loadMatches', function(res, cb) {
      var interestingMatches = res.loadMatches;

      // And format properly
      async.map(interestingMatches, function(match, cb) {
        var participantIdentity = match.participantIdentities.find((p) => p.player && (p.player.currentAccountId === res.loadSummonerData.accountId));
        if(!participantIdentity) {
          // Seems to happen when a summoner changes server
          return cb(null, null);
        }

        var participant = match.participants.find((p) => p.participantId === participantIdentity.participantId);

        // Why rito :(
        var items = [
          participant.stats.item6,
          participant.stats.item0,
          participant.stats.item1,
          participant.stats.item2,
          participant.stats.item3,
          participant.stats.item4,
          participant.stats.item5,
        ];

        // Remove unused items
        items = items.filter(item => !!item);

        // Properly format them
        items = async.reduce(items, [], function(acc, itemId, cb) {
          ddragon.getItemData('euw', itemId, function(err, item) {
            // Item doesn't exist anymore, just skip
            if(err) {
              return cb(null, acc);
            }

            acc.push(item);
            cb(null, acc);
          });
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
          matchUrl += "/" + match.gameId + "/" + res.loadSummonerData.accountId + "?tab=overview";

          var out = {
            id: match.gameId,
            match_url: matchUrl,
            level: participant.stats.champLevel,
            createDate: match.gameCreation,
            victory: participant.stats.win,
            duration: match.gameDuration,
            k: participant.stats.kills || 0,
            d: participant.stats.deaths || 0,
            a: participant.stats.assists || 0,
            cs: participant.stats.totalMinionsKilled,
            queue: match.queueId,
            ward: ward,
            items: items
          };

          cb(null, out);
        });
      }, cb);
    }],
    sendData: ['loadMatchHistory', 'formatMatchHistory', function(r, cb) {
      res.send({
        totalMatches: r.loadMatchHistory.totalGames,
        matches: r.formatMatchHistory.filter(item => !!item)
      });

      cb();
    }]
  },
  function(err) {
    if(err) {
      log(err.toString());
      res.status(err.statusCode || 500).send(err.toString());
    }
  });

};
