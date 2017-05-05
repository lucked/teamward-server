-- Where is every champion playing (which lane), over the last two patches?
-- Only displays roles played in more than 10% of the champion games
SELECT
    participants.champion_id,
    champions.name,
    participants.role,
    COUNT(0) AS nb_games,
    p2.total_nb_games,
    COUNT(0) / p2.total_nb_games * 100 AS percent_play_in_role
FROM
    matches_participants participants
        LEFT JOIN
    champions ON participants.champion_id = champions.id
        LEFT JOIN
    (SELECT
        champion_id, COUNT(0) AS total_nb_games
    FROM
        matches_participants
    GROUP BY champion_id) p2 ON p2.champion_id = participants.champion_id
WHERE role <> "?"
GROUP BY participants.champion_id , participants.role
HAVING percent_play_in_role > 10
