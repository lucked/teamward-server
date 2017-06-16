select distinct summoner_id, last_season
from matches_participants
inner join matches on (matches_participants.match_id = matches.id)
where summoner_id = ANY($1)
and season=7
