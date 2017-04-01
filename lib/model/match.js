'use strict';

var mongoose = require('mongoose');

var rankedEnum = {
  type: String,
  enum: ['UNRANKED', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'MASTER', 'CHALLENGER'],
};

var roleEnum = {
  type: String,
  enum: ['?', 'TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'],
};

var MatchSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
    unique: true,
  },
  mode: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true
  },
  queueType: {
    type: String,
    required: true
  },
  map: {
    type: Number,
    required: true
  },
  patch: {
    type: String,
    required: true
  },
  creation: {
    type: Date,
    required: true
  },
  duration: {
    type: Number,
    required: true,
  },
  tier: rankedEnum,
  // By convention, first team is always the winning team
  teams: [{
    id: Number,
    firstBlood: Boolean,
    firstTower: Boolean,
    firstBaron: Boolean,
    firstInhibitor: Boolean,
    baronKills: Number,
    dragonKills: Number,
    players: [{
      championId: Number,
      summonerId: Number,
      lastSeason: rankedEnum,
      k: Number,
      d: Number,
      a: Number,
      role: roleEnum
    }]
  }]
}, {
  // Disable __v key.
  // We use mongo bulk update operations directly, so we don't need Mongoose here
  versionKey: false
});

MatchSchema.index({"teams.players.summonerId": 1});
MatchSchema.index({"teams.players.championId": 1});


function buildTeam(apiMatch, teamId) {
  var team = {
    id: teamId
  };

  var apiTeam = teamId === 100 ? apiMatch.teams[0] : apiMatch.teams[1];

  team.firstBlood = apiTeam.firstBlood;
  team.firstTower = apiTeam.firstTower;
  team.firstBaron = apiTeam.firstBaron;
  team.firstDragon = apiTeam.firstDragon;
  team.firstInhibitor = apiTeam.firstInhibitor;
  team.baronKills = apiTeam.baronKills;
  team.dragonKills = apiTeam.dragonKills;

  var participantsIdHash = apiTeam.participantIdentities.reduce(function(acc, participantIdentity) {
    acc[participantIdentity.participantId] = participantIdentity;
  }, {});

  team.players = apiMatch.participants.filter(p => p.teamId = teamId).map(function(participant) {
    var role =  participant.timeline.lane;
    if(role === "BOTTOM") {
      role = participant.timeline.lane.replace("DUO_", "");
    }
    if(roleEnum.enum.indexOf(role) === -1) {
      role = "?";
    }
    return {
      championId: participant.championId,
      summonerId: participantsIdHash[participant.participantId].player.summonerId,
      lastSeason: participant.highestAchievedSeasonTier,
      k: participant.stats.kills || 0,
      deaths: participant.stats.deaths || 0,
      assists: participant.stats.assists || 0,
      role: role
    };
  });

  return team;
}

MatchSchema.statics.fromAPI = function fromAPI(apiMatch) {
  var prefix = apiMatch.region.toLowerCase() + ":";

  var match = {};
  match._id = prefix + apiMatch.matchId;
  match.mode = apiMatch.matchMode;
  match.type = apiMatch.matchType;
  match.queueType = apiMatch.queueType;
  match.map = apiMatch.mapId;
  match.patch = apiMatch.matchVersion.split(".", 2).join(".");
  match.creation = apiMatch.matchCreation;
  match.duration = apiMatch.matchDuration;
  match.tier = rankedEnum.enum[Math.round(apiMatch.participants.forEach(p => p.highestAchievedSeasonTier).map(r => rankedEnum.enum.indexOf(r)).reduce((a, r) => a + r, 0) / apiMatch.participants.length)];

  match.winner = apiMatch.stats.win ? apiMatch.teamId : (apiMatch.teamId === 100 ? 200 : 100);
  match.created = new Date(apiMatch.createDate);

  match.teams = apiMatch.teams[0].winner ? [buildTeam(apiMatch, 100), buildTeam(apiMatch, 200)] : [buildTeam(apiMatch, 200), buildTeam(apiMatch, 100)];

  return match;
};


module.exports = mongoose.model("Match", MatchSchema);
