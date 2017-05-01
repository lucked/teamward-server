SELECT
    RAW_DATA.Champion1,
    RAW_DATA.Champion2,
    RAW_DATA.role,
    sum(RAW_DATA.nbgame) as nbgame,
    sum(RAW_DATA.nbwin)/sum(RAW_DATA.nbgame) * 100 as winrate
FROM
(
 SELECT
        player1.champion_id AS champion1,
        player2.champion_id AS champion2,
        player1.role AS role,
        SUM(CASE
            WHEN (matches.winner = player1.team_id) THEN 1
            ELSE 0 END) AS nbwin,
        COUNT(0) AS nbgame
    FROM
        matches
        INNER JOIN matches_participants player1 ON player1.match_id = matches.id AND player1.team_id = 100
        INNER JOIN matches_participants player2 ON player2.match_id = matches.id AND player2.team_id = 200 AND player1.role = player2.role
    GROUP BY
        player1.champion_id,
        player2.champion_id,
        player1.role
    UNION ALL
    SELECT
        player2.champion_id AS champion1,
        player1.champion_id AS champion2,
        player1.role AS role,
        SUM(CASE
            WHEN (matches.winner = player2.team_id) THEN 1
            ELSE 0 END) AS nbwin,
        COUNT(0) AS nbgame
    FROM
        matches
        INNER JOIN matches_participants player1 ON player1.match_id = matches.id AND player1.team_id = 100
        INNER JOIN matches_participants player2 ON player2.match_id = matches.id AND player2.team_id = 200 AND player1.role = player2.role
    GROUP BY
        player1.champion_id,
        player2.champion_id,
        player1.role
) RAW_DATA
GROUP BY
    RAW_DATA.champion1,
    RAW_DATA.champion2,
    RAW_DATA.role
HAVING
    SUM(RAW_DATA.nbgame) > 100;
