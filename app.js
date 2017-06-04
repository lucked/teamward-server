"use strict";

var express = require('express');
var mongoose = require('mongoose');
var morgan = require("morgan");

var config = require('./config');
var app = express();

app.use(morgan('short'));
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
