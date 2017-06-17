"use strict";

var express = require('express');
var mongoose = require('mongoose');
var morgan = require("morgan");

var config = require('./config');
var ddragon = require('./lib/ddragon/');

var app = express();

if(process.env.NODE_ENV !== 'test') {
  app.use(morgan(':method :url :status :response-time ms'));
}

var handlers = require('./lib').handler;
var middlewares = require('./lib').middleware;

app.get('/download', handlers.download.index.get);
app.get('/download/riot.txt', handlers.download.riot.get);
app.get('/summoner/data', middlewares.requireSummonerRegion, handlers.summoner.data.get);
app.get('/summoner/counter', middlewares.requireSummonerRegion, handlers.summoner.counter.get);
app.get('/summoner/performance', middlewares.requireSummonerRegion, handlers.summoner.performance.get);
app.get('/game/data', middlewares.requireSummonerRegion, handlers.game.data.get);
app.get('/push', middlewares.requireSummonerRegion, handlers.push.get);
app.get('/champion/:champion', handlers.champion.get);

mongoose.connect(config.mongoUrl);

module.exports = app;

// Preload ddragon cache
var noop = function() {};
ddragon.getChampionData('euw', 420, noop);
ddragon.getSummonerSpellData('euw', 4, noop);
