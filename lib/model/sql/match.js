"use strict";
const ROLES = ['?', 'TOP', 'JUNGLE', 'MID', 'CARRY', 'SUPPORT'];
const RANKED_ENUM = ['UNRANKED', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'MASTER', 'CHALLENGER'];

var buildPlayers = function buildPlayers(apiMatch, knownPlayerInformation) {
  var participantsIdHash = apiMatch.participantIdentities.reduce(function(acc, participantIdentity) {
    acc[participantIdentity.participantId] = participantIdentity;
    return acc;
  }, {});

  var team = apiMatch.participants.map(function(participant) {
    // jshint maxcomplexity: 40
    var role =  participant.timeline.lane;
    if(role === "BOTTOM") {
      role = participant.timeline.role.replace("DUO_", "");
    }
    if(role === "MIDDLE") {
      role = "MID";
    }
    if(ROLES.indexOf(role) === -1) {
      role = "?";
    }
    var summonerId = null;

    // First case: information are already in the API, use them
    if(participantsIdHash[participant.participantId] && participantsIdHash[participant.participantId].player && participantsIdHash[participant.participantId].player.summonerId) {
      summonerId = participantsIdHash[participant.participantId].player.summonerId;
    }
    // Second case: information isn't in the API. Let's hope it's part of the "knownPlayerInformation" bundle that was sent when the game was queued
    else if(knownPlayerInformation && knownPlayerInformation[participant.teamId][participant.championId]) {
      summonerId = knownPlayerInformation[participant.teamId][participant.championId];
    }

    return {
      match_id: apiMatch.matchId,
      region: apiMatch.region.toLowerCase(),
      team_id: participant.teamId,
      summoner_id: summonerId,
      role: role,
      champion_id: participant.championId,
      kills: participant.stats.kills || 0,
      deaths: participant.stats.deaths || 0,
      assists: participant.stats.assists || 0,
      cs: participant.stats.minionsKilled || 0,
      first_blood: participant.stats.firstBloodKill || false,
      first_tower: participant.stats.firstTowerKill || false,
      first_inhibitor: participant.stats.firstInhibitorKill || false,
      largest_kill: participant.stats.largestMultiKill,
      largest_spree: participant.stats.largestKillingSpree,
      tower_kills: participant.stats.towerKills || 0,
      inhibitor_kills: participant.stats.inhibitorKills || 0,
      gold_earned: participant.stats.goldEarned,
      last_season: participant.highestAchievedSeasonTier || 'UNRANKED',
      spell_d: participant.spell1Id,
      spell_f: participant.spell2Id,
      item_0: participant.stats.item0,
      item_1: participant.stats.item1,
      item_2: participant.stats.item2,
      item_3: participant.stats.item3,
      item_4: participant.stats.item4,
      item_5: participant.stats.item5,
      item_6: participant.stats.item6,
      gold_0_10: participant.timeline.goldPerMinDeltas ? Math.round((participant.timeline.goldPerMinDeltas.zeroToTen || 0) * 10) : 0,
      gold_10_20: participant.timeline.goldPerMinDeltas ? Math.round((participant.timeline.goldPerMinDeltas.tenToTwenty || 0) * 10) : 0,
      xp_0_10: participant.timeline.xpPerMinDeltas ? Math.round((participant.timeline.xpPerMinDeltas.zeroToTen || 0) * 10) : 0,
      xp_10_20: participant.timeline.xpPerMinDeltas ? Math.round((participant.timeline.xpPerMinDeltas.tenToTwenty || 0) * 10) : 0,
      double_kills: participant.stats.doubleKills || 0,
      triple_kills: participant.stats.tripleKills || 0,
      quadra_kills: participant.stats.quadraKills || 0,
      penta_kills: participant.stats.pentaKills || 0,
    };
  });

  return team;
};

var buildGame = function buildGame(apiMatch) {
  var match = {};
  match.id = apiMatch.matchId;
  match.region = apiMatch.region.toLowerCase();
  match.winner = apiMatch.teams[0].winner ? apiMatch.teams[0].teamId : apiMatch.teams[1].teamId;
  match.queue = apiMatch.queueType;
  match.map = apiMatch.mapId;
  var patch = apiMatch.matchVersion ? apiMatch.matchVersion.split(".", 2) : [0, 0];
  match.season = patch[0];
  match.patch = patch[1];
  match.creation = (new Date(apiMatch.matchCreation)).toISOString().substring(0, 19).replace('T', ' ');
  match.duration = apiMatch.matchDuration;
  match.rank = RANKED_ENUM[Math.round(apiMatch.participants.map(p => p.highestAchievedSeasonTier || 'UNRANKED').map(r => RANKED_ENUM.indexOf(r)).reduce((a, r) => a + r, 0) / apiMatch.participants.length)];
  return match;
};

module.exports = {
  buildGame: buildGame,
  buildPlayers: buildPlayers,
};
