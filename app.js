"use strict";

var express = require('express');
var mongoose = require('mongoose');

var config = require('./config');

var app = express();

var handlers = require('./lib').handler;

app.get('/game/data', handlers.game.data.get);
mongoose.connect(config.mongoUrl);

module.exports = app;
