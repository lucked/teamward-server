-- Return the most recent patch with at least the specified number of games
-- param: number_of_games
SELECT
    patch, COUNT(0) AS count
FROM
    matches
GROUP BY patch
HAVING count > ?
ORDER BY patch DESC
LIMIT 1
