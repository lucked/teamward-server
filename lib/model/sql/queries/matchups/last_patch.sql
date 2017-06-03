-- Return the most recent patch with at least the specified number of games
-- param: number_of_games
SELECT
    season, patch_number, COUNT(0) AS count
FROM
    matches
GROUP BY season, patch_number
HAVING count > ?
ORDER BY season, patch_number DESC
LIMIT 1
