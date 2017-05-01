SELECT
    matches.id, gold_earned
FROM
    matches
        INNER JOIN
    matches_participants ON (match_id = matches.id
        AND summoner_id = 70448430
        AND region = 'euw')
ORDER BY gold_earned DESC
LIMIT 1
