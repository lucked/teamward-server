'use strict';

var async = require("async");
var superagent = require("superagent");
var rarity = require("rarity");
var log = require("debug")("teamward:ddragon");

var riotRequest = require('../riot-api/request.js');
var duration = require('../helper/duration.js');


module.exports._cache = {};
function downloadOrGetFromCache(endpoint, cb) {
  if(module.exports._cache[endpoint]) {
    return cb(null, module.exports._cache[endpoint]);
  }

  log("Downloading " + endpoint + " for the first time");
  superagent
    .get('https://ddragon.leagueoflegends.com' + endpoint)
    .end(function(err, res) {
      if(err) {
        return cb(err);
      }

      var json;
      try {
        json = JSON.parse(res.text);
      }
      catch(e) {
        /* istanbul ignore next */
        console.log(e.toString());
        console.log(res.text);
        throw e;
      }

      module.exports._cache[endpoint] = json;
      cb(null, json);

    });
}


module.exports.currentPatch = function(region, cb) {
  downloadOrGetFromCache('/realms/' + region + '.json', function(err, patchData) {
    cb(err, patchData && patchData.v);
  });
};


module.exports.getChampionsData = function(patch, cb) {
  downloadOrGetFromCache('/cdn/' + patch + '/data/en_US/champion.json', cb);
};


module.exports.getSummonerSpellsData = function(patch, cb) {
  downloadOrGetFromCache('/cdn/' + patch + '/data/en_US/summoner.json', cb);
};


module.exports.getItemsData = function(patch, cb) {
  downloadOrGetFromCache('/cdn/' + patch + '/data/en_US/item.json', cb);
};

// Return detailed data for a particular champion (spells, passive, tips...,
// id can be a numeric value (e.g. 420) or the champion api name ("Illaoi", or "MonkeyKing")
module.exports.getDetailedChampionData = function(locale, championId, cb) {
  async.waterfall([
    function getChampionData(cb) {
      module.exports.getChampionData('euw', championId, cb);
    },
    function downloadSpecificData(ddragonData, cb) {
      var endpoint = '/lol/static-data/v3/champions?tags=enemytips&tags=passive&tags=spells&locale=' + locale;

      riotRequest('euw1', endpoint, duration.A_DAY, rarity.carry([ddragonData.id], cb));
    },
    function extractInterestingData(championKey, detailedData, cb) {
      cb(null, detailedData.data[championKey]);
    }
  ], cb);
};

// Return data for a particular champion,
// id can be a numeric value (e.g. 420) or the champion api name ("Illaoi", or "MonkeyKing")
module.exports.getChampionData = function(region, championId, cb) {
  var intChampionId = parseInt(championId);
  async.waterfall([
    module.exports.currentPatch.bind(null, region),
    function(currentPatch, cb) {
      module.exports.getChampionsData(currentPatch, rarity.carry(currentPatch, cb));
    },
    function(currentPatch, championsData, cb) {
      var championsNames = Object.keys(championsData.data);
      for(var i = 0; i < championsNames.length; i += 1) {
        var championData = championsData.data[championsNames[i]];

        if(parseInt(championData.key) === intChampionId || championId === championData.id || championId === championData.name) {
          championData.image_url = 'https://ddragon.leagueoflegends.com/cdn/' + currentPatch + '/img/champion/' + championData.image.full;
          championData.splash_url = 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/' + championData.id + "_0.jpg";
          championData.gg_url = 'http://champion.gg/' + championData.id;
          return cb(null, championData);
        }
      }

      return cb(new Error("Unknown champion: " + championId));
    }
  ], cb);
};


module.exports.getSummonerSpellData = function(region, spellId, cb) {
  spellId = parseInt(spellId);

  async.waterfall([
    module.exports.currentPatch.bind(null, region),
    function(currentPatch, cb) {
      module.exports.getSummonerSpellsData(currentPatch, rarity.carry(currentPatch, cb));
    },
    function(currentPatch, spellsData, cb) {
      var spellsName = Object.keys(spellsData.data);
      for(var i = 0; i < spellsName.length; i += 1) {
        var spellData = spellsData.data[spellsName[i]];

        if(parseInt(spellData.key) === spellId) {
          spellData.image_url = 'https://ddragon.leagueoflegends.com/cdn/' + currentPatch + '/img/spell/' + spellData.id + '.png';

          return cb(null, spellData);
        }
      }

      // Unknown spell, fail gracefully
      return cb(null, {name: '?', image_url: null});
    }
  ], cb);
};


module.exports.getItemData = function(region, itemId, cb) {
  itemId = parseInt(itemId);

  async.waterfall([
    module.exports.currentPatch.bind(null, region),
    function(currentPatch, cb) {
      module.exports.getItemsData(currentPatch, rarity.carry(currentPatch, cb));
    },
    function(currentPatch, itemsData, cb) {
      var itemsIds = Object.keys(itemsData.data);
      for(var i = 0; i < itemsIds.length; i += 1) {
        if(parseInt(itemsIds[i]) === itemId) {
          var itemData = itemsData.data[itemsIds[i]];
          itemData.id = itemId;
          itemData.image_url = 'https://ddragon.leagueoflegends.com/cdn/' + currentPatch + '/img/item/' + itemId + '.png';

          return cb(null, itemData);
        }
      }

      return cb(new Error("Unknown item: " + itemId));
    }
  ], cb);
};
