SELECT (SELECT
    COUNT(0)
FROM
    matches
        INNER JOIN
    matches_participants ON (match_id = matches.id
        AND summoner_id = 70448430
        AND region = 'euw')
) AS count, (SELECT
    COUNT(0)
FROM
    matches
        INNER JOIN
    matches_participants ON (match_id = matches.id
        AND summoner_id = 70448430
        AND region = 'euw'
        AND first_blood=TRUE)
) AS first_blood, (SELECT
    COUNT(0)
FROM
    matches
        INNER JOIN
    matches_participants ON (match_id = matches.id
        AND summoner_id = 70448430
        AND region = 'euw'
        AND first_tower=TRUE)
) AS first_tower, (SELECT
    COUNT(0)
FROM
    matches
        INNER JOIN
    matches_participants ON (match_id = matches.id
        AND summoner_id = 70448430
        AND region = 'euw'
        AND first_inhibitor=TRUE)
) AS first_inhibitor
