SELECT
	player1.champion_id AS champion,
	SUM(CASE
		WHEN (matches.winner = player1.team_id) THEN 1
		ELSE 0 END)/COUNT(0) * 100 AS winrate,
	COUNT(0) AS nbgame
FROM
	matches
	INNER JOIN matches_participants player1 ON player1.match_id = matches.id
WHERE
	player1.summoner_id = 70448430
GROUP BY
	player1.champion_id
ORDER BY winrate desc;
