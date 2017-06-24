SELECT
  player2.champion_id AS champion,
    name,
  ROUND((100.0 * SUM(CASE
    WHEN (matches.winner = player1.team_id) THEN 1
    ELSE 0 END)/COUNT(0))::numeric, 2) AS winrate,
  COUNT(0) AS nbgame
FROM
  matches
INNER JOIN matches_participants player1 ON player1.match_id = matches.id
INNER JOIN matches_participants player2 ON player2.match_id = matches.id AND player1.team_id <> player2.team_id and player1.role = player2.role
INNER JOIN champions on (player2.champion_id=champions.id)
WHERE
  player1.summoner_id = 70448430
  AND matches.region = 'euw'
GROUP BY
  player2.champion_id,
  champions.name
ORDER BY winrate desc;
