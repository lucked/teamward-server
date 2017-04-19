# Teamward: League Of Legends game statistics
> This is the server component. The client is [here](https://github.com/neamar/teamward-client).

Get information about your current games:

* Champions you're facing
* Champions mastery score
* Summoner rank
* Is it his main champ?
* Premade information
* Matchup statistics
* And more!

## Credits
Uses Riot Public API https://developer.riotgames.com/api
TeamWard isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing League of Legends. League of Legends and Riot Games are trademarks or registered trademarks of Riot Games, Inc. League of Legends © Riot Games, Inc.

Uses http://champion.gg data for matchups.

## Install
Run `npm install`. You'll need a version of node >= 4, and MongoDB.

## How?
Using the Riot API, this app will retrieve information about the current game for the given summoner, and build a single unified JSON (`GET /game/data`) with all the informations you'll need to know if you should play safe or very agressively. 

## Architecture
Don't forget to set an environment variable named `RIOT_API_KEY` to use the project (get a key [here](https://developer.riotgames.com/docs/api-keys)).
If you use a production API key, you can set `RIOT_API_RATE_LIMITS` to `3000,180000` or whatever your rate limit is, in the format `10s_limit,10min_limit` to speed up everything by sending more calls in parralel. Don't do that with a development key, or you'll get banned!

Most of the code is in the `lib/` folder.

* `lib/ddragon` contains helpers to deal with the Riot Static Data: champion avatar, champions stats, summoner icons, etc. 
* `lib/handler` contains the actual HTTP handler used by Express to serve your requests. The most interesting one is probably `lib/handler/game/data.js`.
* `lib/helper` is a set of useful helpers used throughout the code
    - `lib/helper/game` is the main helper for the game data endpoint
    - `lib/helper/roles` will try to ifner role based on summoner spell and usual champion roles
    - `lib/helper/matchups` will return information about a specific matchup
* `lib/middleware` is a collection of small composable middlewares used with express
* `lib/model` defines the data model used for persisting data
* `lib/riot-api` communicates with the Riot API. An interesting file in here is `lib/riot-api/request.js`: it will handle all the rate limiting and is used as a low-level library for all requests to the Riot API. It will also cache requests, and serve data from cache. 
* `lib/worker` contains a list of useful worker. They can be started with `node bin/worker.js`. You may want to run `node bin/both.js` to start the server and all the workers at the same time.

## Using locally
You'll need node.js and mongodb.
Run `npm install`.

Create a `.env` file at project root using this template:

```bash
RIOT_API_KEY="your riot key from developer.riotgames.com"
DEBUG="teamward:*"
GCM_API_KEY="your gcm api key, or a fake value if you don't plan to develop on GCM"
```

Run `npm test` to make sure everything is correctly setup.

To test locally, simply run `npm start`. You may want to use nodemon instead to hot-reload you changes.

## Deploying
The app can easily be deployed in many services -- start the app with `PORT=yourport npm start` and you're good to go.

More environment variables are available, see `config/index.js` for details.

By default, the app is set up to use NewRelic for monitoring, HostedGraphite for metric tracking and Opbeat for error reporting. If you don't specify the keys in your environement however, the services just won't be used. If you want to use your own services, have a look in `lib/error-logger.js` and `lib/metric-tracker.js` which provide an high level interface easily reconfigurable.

Don't forget to wire up the workers too: in addition to npm start, you'll probably want to always run `node bin/worker-push-notifier.js` to send notifications to your users, and run every day `node bin/worker-champion-stats` to ensure matchups stats are up to date.
