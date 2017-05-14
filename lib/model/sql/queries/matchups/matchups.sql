-- Matchup stats, over the specified patch
-- Reads "champion1 won nb_wins games against champion2, out of a total of nb_games
-- param: last_patch
SELECT /*+ MAX_EXECUTION_TIME(7200) */
        player1.champion_id AS champion1_id,
        player2.champion_id AS champion2_id,
        player1.role AS role,
        COUNT(matches.winner = player1.team_id OR null) as nb_wins,
        COUNT(0) AS nb_games,
        COUNT(matches.winner = player1.team_id OR null) / COUNT(0) * 100 AS winrate
FROM matches
INNER JOIN matches_participants player1 ON player1.match_id = matches.id
INNER JOIN matches_participants player2 ON player2.match_id = matches.id AND player2.team_id != player1.team_id AND player1.role = player2.role
WHERE patch = ?
GROUP BY
    player1.champion_id,
    player2.champion_id,
    player1.role
HAVING
    nb_games > 100;
