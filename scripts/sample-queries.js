/* global db */
// Game tiers
db.matches.aggregate(
 [
   {$group: {_id: "$tier", total: {$sum: 1}}},
   {$sort: {total: -1}}
 ]
);

// Pentakills
db.matches.aggregate(
 [
   {$match: {"teams.players.largestKill": 5}},
   {$group: {_id: "penta", total: {$sum: 1}}},
   {$sort: {total: -1}}
 ]
);

// Game count with specified champion
db.matches.aggregate(
 [
   {$match: {"teams.players.championId": 420}},
   {$group: {_id: "games", total: {$sum: 1}}},
 ]
);

// Champion position
db.matches.aggregate(
 [
   {$match: {"teams.players.championId": 420}},
   {$unwind: "$teams"},
   {$unwind: "$teams.players"},
   {$match: {"teams.players.championId": 420}},
   {$group: {_id: "$teams.players.role", total: {$sum: 1}}},
 ]
);


db.matches.aggregate(
 [
  {
    $project: {
      "toplaner": {
        $filter: {
          input: "$teams.players",
          as: "player",
          cond: {
            $and: [
              {$eq: ["$$player.role", "TOP"]},
            ]
          }
        }
      }
    }
  },
]);
