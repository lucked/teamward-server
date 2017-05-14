SELECT
    SUM(double_kills), SUM(triple_kills), SUM(quadra_kills), SUM(penta_kills)
FROM
    matches
        INNER JOIN
    matches_participants ON (match_id = matches.id
        AND summoner_id = 70448430
        AND region = 'euw'
  )
