SELECT
	player1.champion_id AS champion,
    champions.name,
	ROUND((100.0 * SUM(CASE
		WHEN (matches.winner = player1.team_id) THEN 1
		ELSE 0 END)/COUNT(0))::numeric, 2) AS winrate,
	COUNT(0) AS nbgame,
    SUM(CASE
		WHEN (matches.winner = player1.team_id) THEN 1
		ELSE 0 END) as nbwins,
    ROUND((1.0 * SUM(kills)/COUNT(0))::numeric, 2) as kills_average,
     ROUND((1.0 * SUM(deaths)/COUNT(0))::numeric, 2) as deaths_average
FROM
	matches
	INNER JOIN matches_participants player1 ON player1.match_id = matches.id
    INNER JOIN champions ON champion_id = champions.id
WHERE
	player1.summoner_id = 70448430
  AND matches.region = 'euw'
GROUP BY
	player1.champion_id,
    champions.name
HAVING COUNT(0) > 5
ORDER BY winrate desc;
