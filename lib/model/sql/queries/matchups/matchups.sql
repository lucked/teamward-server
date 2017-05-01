SELECT
    Champion1, Champion2, role, SUM(nbgame), SUM(nbwin) / SUM(nbgame) * 100 AS winrate
FROM
    (SELECT
        champion1, champion2, role, nbwin, nbgame
    FROM
        Matchup
UNION ALL
SELECT
        champion2,
            champion1,
            role,
            (nbgame - nbwin) AS nbwin,
            nbgame
    FROM
        Matchup) Gathered_data
GROUP BY champion1 , champion2 , role
HAVING SUM(nbgame) > 100
ORDER BY winrate ASC;
