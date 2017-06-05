-- Where is every champion playing (which lane), over the last two patches
-- Only displays roles played in more than 10% of the champion games
-- param: season
-- param: patch

SELECT
    participants.champion_id,
    participants.role,
    COUNT(0) AS nb_games_in_role,
    COUNT(matches.winner = participants.team_id OR null) as nb_wins_in_role,
    p2.total_nb_games,
    100.0 * COUNT(0) / p2.total_nb_games AS percent_play_in_role,
    100.0 * COUNT(matches.winner = participants.team_id OR null) / COUNT(0) AS winrate
FROM
    matches_participants participants
        LEFT JOIN
    matches ON (matches.id = participants.match_id)
        LEFT JOIN
    (SELECT
        champion_id, COUNT(0) AS total_nb_games
    FROM
        matches_participants
    LEFT JOIN matches ON (matches.id = matches_participants.match_id)
    WHERE season = $1 AND patch = $2 AND queue IN ('TEAM_BUILDER_RANKED_SOLO', 'RANKED_FLEX_SR')
    GROUP BY champion_id) p2 ON p2.champion_id = participants.champion_id
WHERE
    role <> '?' AND season = $1 AND patch = $2 AND queue IN ('TEAM_BUILDER_RANKED_SOLO', 'RANKED_FLEX_SR')
GROUP BY participants.champion_id , participants.role, p2.total_nb_games

HAVING COUNT(0) / p2.total_nb_games * 100 > 10
