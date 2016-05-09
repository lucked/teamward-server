# Teamward: League Of Legends game statistics
> This is the server component. The client is [here](https://github.com/neamar/teamward-client).

Get information about your current games:

* Champions you're facing
* Champions mastery score
* Summoner rank
* Is it his main champ?
* And more!

Uses Riot Public API https://developer.riotgames.com/api
TeamWard isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing League of Legends. League of Legends and Riot Games are trademarks or registered trademarks of Riot Games, Inc. League of Legends © Riot Games, Inc.

## How?
Using the Riot API, this app will retrieve information about the current game for the given summoner, and build a single unified JSON (`GET /game/data`) with all the informations you'll need.
Know you know if you should play safe or very agressively. 

## Architecture
Don't forget to set an environment var `RIOT_API_KEY` to use the project (get a key [here](https://developer.riotgames.com/docs/api-keys))

Most of the code is in the `lib/` folder.

* `lib/ddragon` contains helpers to deal with the Riot Static Data: champion avatar, champions stats, summoner icons, etc. 
* `lib/handler` contains the actual HTTP handler used by Express to serve your requests. The most interesting one is probably `lib/handler/game/data.js`.
* `lib/helpers` is a set of useful helpers used throughout the code.
* `lib/middleware` is a collection of small composable middlewares used with express
* `lib/models` defines the data model used for persisting data
* `lib/riot-api` communicates with the Riot API. An interesting file in here is `lib/riot-api/request.js`: it will handle all the rate limiting and is used as a low-level library for all requests to the Riot API. It will also cache requests, and serve data from cache. 

## Using locally
You'll need node.js.
Run `npm install`, and `npm test` to make sure everything is correctly setup.

To test locally, simply run `npm start`. You may want to use nodemon instead to hot-reload you changes.
