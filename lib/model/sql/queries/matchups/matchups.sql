-- Matchup stats, over the last two patches only
-- Reads "champion1 won nb_wins games against champion2, out of a total of nb_games
-- ? last_patch
SELECT
        player1.champion_id AS champion1,
        champions1.name AS champion1name,
        player2.champion_id AS champion2,
        champions2.name AS champion2name,
        player1.role AS role,
        COUNT(matches.winner = player1.team_id OR null) as nb_wins,
        COUNT(0) AS nb_games,
        COUNT(matches.winner = player1.team_id OR null) / COUNT(0) * 100 AS percent_win
FROM matches
INNER JOIN matches_participants player1 ON player1.match_id = matches.id
INNER JOIN matches_participants player2 ON player2.match_id = matches.id AND player2.team_id != player1.team_id AND player1.role = player2.role
LEFT JOIN champions champions1 ON player1.champion_id = champions1.id
LEFT JOIN champions champions2 ON player2.champion_id = champions2.id
WHERE patch = ?
GROUP BY
    player1.champion_id,
    player2.champion_id,
    player1.role
HAVING
    nb_games > 100;
