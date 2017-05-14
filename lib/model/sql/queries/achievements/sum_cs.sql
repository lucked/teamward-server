SELECT
    SUM(cs)
FROM
    matches
        INNER JOIN
    matches_participants ON (match_id = matches.id
        AND summoner_id = 70448430
        AND region = 'euw')
