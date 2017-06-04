-- Return the most recent patch with at least the specified number of games
-- param: number_of_games
SELECT
    season, patch, COUNT(0) AS count
FROM
    matches
GROUP BY season, patch
HAVING COUNT(0) > ?
ORDER BY season DESC, patch DESC
LIMIT 1
