"use strict";

var express = require('express');
var mongoose = require('mongoose');

var config = require('./config');
var app = express();

var handlers = require('./lib').handler;
var middlewares = require('./lib').middleware;

app.get('/summoner/data', middlewares.requireSummonerRegion, handlers.summoner.data.get);
app.get('/game/data', middlewares.requireSummonerRegion, handlers.game.data.get);
mongoose.connect(config.mongoUrl);

module.exports = app;
