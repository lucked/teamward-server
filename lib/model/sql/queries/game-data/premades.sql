select distinct p1.summoner_id AS p1, p2.summoner_id AS p2
from matches_participants p1
inner join matches_participants p2 ON (p1.match_id = p2.match_id)
WHERE p1.summoner_id = ANY($1) AND p1.region = $2
AND p2.summoner_id = ANY($1) AND p2.region = $2
AND p1.summoner_id <> p2.summoner_id
