SELECT
    MAX(kills), MAX(deaths), MAX(assists), MAX(CAST(kills AS SIGNED) + CAST(assists AS SIGNED) - CAST(deaths AS SIGNED)) AS best_kda, MIN(CAST(kills AS SIGNED) + CAST(assists AS SIGNED) - CAST(deaths AS SIGNED)) AS worst_kda
FROM
    matches
        INNER JOIN
    matches_participants ON (match_id = matches.id  )
