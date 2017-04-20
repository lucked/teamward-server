"use strict";

var async = require("async");
var log = require('debug')('teamward:handler:champion');
var rarity = require("rarity");

var ddragon = require('../ddragon/index.js');
var errorLogger = require('../error-logger');

const LOCALES = ["pt_BR", "cs_CZ", "en_US", "en_GB", "en_AU", "fr_FR", "de_DE", "el_GR", "hu_HU", "id_ID", "it_IT", "jp_JP", "ko_KR", "ms_MY", "en_PH", "pl_PL", "ro_RO", "ru_RU", "zh_CN", "zh_MY", "en_SG", "es_ES", "es_MX", "es_AR", "th_TH", "zh_TW", "tr_TR", "vn_VN", ];

module.exports.get = function(req, res) {
  if(!req.params.champion) {
    res.status(409).send('Missing champion param!');
    return;
  }

  if(!req.query.locale || LOCALES.indexOf(req.query.locale) === -1) {
    req.query.locale = "en_GB";
  }

  async.waterfall([
    ddragon.currentPatch.bind(null, 'euw'),
    function getChampionData(currentPatch, cb) {
      ddragon.getDetailedChampionData(req.query.locale, req.params.champion, rarity.carry([currentPatch], cb));
    },
    function sendData(currentPatch, championData, cb) {
      res.send({
        id: championData.id,
        name: championData.name,
        tips: championData.enemytips,
        spells: championData.spells.map((spell) => {
          return {
            name: spell.name,
            description: spell.description,
            cooldowns: spell.cooldownBurn,
            image: 'http://ddragon.leagueoflegends.com/cdn/' + currentPatch + '/img/spell/' + spell.image.full
          };
        }),
        passive: {
          name: championData.passive.name,
          description: championData.passive.description,
          image: 'http://ddragon.leagueoflegends.com/cdn/' + currentPatch + '/img/passive/' + championData.passive.image.full
        },
      });

      cb();
    }
  ], function(err) {
    if(err) {
      errorLogger(err, {
        req: req,
        log: log
      });
      res.status(err.statusCode || 500).send(err.toString());

      return;
    }
  });
};
