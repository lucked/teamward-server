-- Where is every champion playing (which lane), over the last two patches
-- Only displays roles played in more than 10% of the champion games
-- param: season
-- param: patch_number
-- param: season
-- param: patch_number

SELECT /*+ MAX_EXECUTION_TIME(7200) */
    participants.champion_id,
    participants.role,
    COUNT(0) AS nb_games_in_role,
    COUNT(matches.winner = participants.team_id OR null) as nb_wins_in_role,
    p2.total_nb_games,
    COUNT(0) / p2.total_nb_games * 100 AS percent_play_in_role,
    COUNT(matches.winner = participants.team_id OR null) / COUNT(0) * 100 AS winrate
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
    WHERE season = ? AND patch_number = ? AND queue IN ('TEAM_BUILDER_RANKED_SOLO', 'RANKED_FLEX_SR')
    GROUP BY champion_id) p2 ON p2.champion_id = participants.champion_id
WHERE
    -- question mark must be escaped... because param interpolation sucks with mysql/anydb
    role <> CHAR(63) AND season = ? AND patch_number = ? AND queue IN ('TEAM_BUILDER_RANKED_SOLO', 'RANKED_FLEX_SR')
GROUP BY participants.champion_id , participants.role
HAVING percent_play_in_role > 10
