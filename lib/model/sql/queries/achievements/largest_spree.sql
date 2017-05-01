SELECT
    matches.id, largest_spree
FROM
    matches
        INNER JOIN
    matches_participants ON (match_id = matches.id
        AND summoner_id = 70448430
        AND region = 'euw'
  )
ORDER BY largest_spree DESC
LIMIT 1
