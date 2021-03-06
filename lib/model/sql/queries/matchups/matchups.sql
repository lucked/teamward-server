-- Matchup stats, over the specified patch
-- Reads "champion1 won nb_wins games against champion2, out of a total of nb_games
-- param: season
-- param: patch_number
SELECT
        player1.champion_id AS champion1_id,
        player2.champion_id AS champion2_id,
        player1.role AS role,
        COUNT(matches.winner = player1.team_id OR null) as nb_wins,
        COUNT(0) AS nb_games,
        100.0 * COUNT(matches.winner = player1.team_id OR null) / COUNT(0) AS winrate
FROM matches
INNER JOIN matches_participants player1 ON player1.match_id = matches.id AND player1.region = matches.region
INNER JOIN matches_participants player2 ON player2.match_id = matches.id AND player1.region = matches.region AND player2.team_id != player1.team_id AND player1.role = player2.role
WHERE season = $1 AND patch = $2  AND queue IN ('TEAM_BUILDER_RANKED_SOLO', 'RANKED_FLEX_SR')
GROUP BY
    player1.champion_id,
    player2.champion_id,
    player1.role
HAVING
    COUNT(0) > 150;
