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
If you use a production API key, you can set `RIOT_API_KEY_IS_PRODUCTION` to 1 to speed up everything by sending more calls in parralel. Don't do that with a development key, or you'll get banned!

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
You'll need node.js.
Run `npm install`, and `npm test` to make sure everything is correctly setup.

To test locally, simply run `npm start`. You may want to use nodemon instead to hot-reload you changes.
