select distinct summoner_id, last_season
from matches_participants
inner join matches on (matches_participants.match_id = matches.id)
where summoner_id = ANY($1) AND matches_participants.region=$2
and season=(select max(season) from matches)
