'use strict';

var async = require("async");
var debug = require('debug')('teamward:worker:download-games:queue');
var FJQ = require('featureless-job-queue');
var newrelic = require("newrelic");
var pg = require("pg");
var url = require('url');

var config = require('../../config');
var errorLogger = require('../error-logger.js');

var gameInfo = require('../riot-api/game-info.js');
var Match = require('../model/sql/match.js');

const QUEUE_CONCURRENCY = config.gameDownloadQueueConcurrency;

var fjq = new FJQ({
  redisUrl: config.redisUrl,
  redisKey: 'download-games:jobs'
});

// Pool is not intiialized by default, we'll only open SQL connections if we use this function at some point
// (for instance, there is no point creating a SQL pool for web workers)
var pool;

// pg users are extremist.
// You don't negotiate with extremists.
// https://github.com/brianc/node-postgres/issues/1100
function queryToPg(sql) {
  var counter = 1;
  var pg = sql;

  do {
    sql = pg;
    pg = sql.replace('?', '$' + counter);
    counter += 1;
  }
  while(pg !== sql);

  return pg;
}
var workerFunction = newrelic.createBackgroundTransaction('download-game:download', 'workers', function workerFunction(job, done) {
  // One time pool initialization
  if(!pool) {
    var params = url.parse(config.sqlUrl);
    var auth = params.auth.split(':');

    var pgConfig = {
      user: auth[0],
      password: auth[1],
      host: params.hostname,
      port: params.port,
      database: params.pathname.split('/')[1],
      ssl: true,
      max: QUEUE_CONCURRENCY
    };
    pool = new pg.Pool(pgConfig);
  }

  async.waterfall([
    function checkAlreadyAvailable(cb) {
      pool.query("SELECT id FROM matches WHERE id = $1 AND region= $2", [job.id, job.region], cb);
    },
    function downloadGameFromAPI(res, cb) {
      if(res.rowCount !== 0) {
        debug("Skipping game " + job.id);
        return done();
      }
      debug("Downloading game #" + job.id + " (" + job.region + ")");
      gameInfo.getExistingGame(job.id, job.region, cb);
    },
    function createTransaction(apiMatchData, cb) {
      pool.connect(function(err, client, done) {
        var wrapperCb = function(err) {
          done(err);
          cb(err);
        };

        if(err) {
          // Wasn't able to acquire connection
          return cb(err);
        }

        async.waterfall([
          function startTransaction(cb) {
            client.query('BEGIN', cb);
          },
          function saveGame(res, cb) {
            var match;
            try {
              match = Match.buildGame(apiMatchData);
            }
            catch(err) {
              return cb(err);
            }

            var columns = Object.keys(match);
            var values = columns.map(c => match[c]);
            var placeholders = columns.map(function() {
              return "?";
            }).join(",");

            client.query(queryToPg("INSERT INTO matches(" + columns.join(',') + ") VALUES(" + placeholders + ")"), values, cb);
          },
          function savePlayers(res, cb) {
            var players;
            players = Match.buildPlayers(apiMatchData, job.knownPlayerInformation);

            var columns = Object.keys(players[0]);
            var values = [];
            var inserts = [];
            players.forEach(function(player) {
              values = values.concat(columns.map(c => player[c]));
              values = values.map((v) => v === true ? 1 : (v === false ? 0 : (v ? v : 0)));
              var placeholders = columns.map(function() {
                return "?";
              }).join(",");

              inserts.push("(" + placeholders + ")");
            });

            client.query(queryToPg("INSERT INTO matches_participants(" + columns.join(',') + ") VALUES " + inserts.join(",")), values, cb);
          },
          function commit(res, cb) {
            client.query('COMMIT', cb);
          }
        ], function(err) {
          if(err) {
            client.query('ROLLBACK', function() {
              // Kill the client
              wrapperCb(err);
            });
            return;
          }

          wrapperCb();

        });
      });
    }], function(err) {
      if(err) {
        console.warn(err);
      }

      done(err);
    });
});


module.exports = function startQueue(options) {
  if(!options) {
    options = {};
  }

  var queue = fjq.process(workerFunction, QUEUE_CONCURRENCY);

  // Do not register sigterm receiver when testing
  /* istanbul ignore next */
  if(!options.testing) {
    process.once('SIGTERM', function stopQueue() {
      debug("Received SIGTERM, pausing queue.");
      // Dyno is dying, finish current stuff but do not start the processing of new tasks.
      fjq.shutdown(function(err) {
        if(err) {
          errorLogger(err);
        }
        else {
          debug("Shutting down process after SIGTERM, workers were paused.");
          process.exit(0);
        }
      });
    });
  }

  return queue;
};

module.exports.workerFunction = workerFunction;
