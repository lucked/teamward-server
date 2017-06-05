CREATE TYPE rankType AS ENUM('UNRANKED','BRONZE','SILVER','GOLD','PLATINUM','DIAMOND','MASTER','CHALLENGER');
CREATE TYPE roleType AS ENUM('?','TOP','JUNGLE','MID','CARRY','SUPPORT');

CREATE TABLE public.matches
(
  id bigint NOT NULL,
  region char(4) COLLATE pg_catalog."default" NOT NULL,
  winner integer NOT NULL,
  queue character varying(45) COLLATE pg_catalog."default" NOT NULL,
  map integer NOT NULL,
  season integer NOT NULL,
  patch integer NOT NULL,
  creation timestamp without time zone NOT NULL,
  duration integer NOT NULL,
  rank ranktype NOT NULL,
  CONSTRAINT matches_pkey PRIMARY KEY (id, region)
);

CREATE TABLE public.matches_participants
(
  id SERIAL,
  match_id bigint NOT NULL,
  region char(4) COLLATE pg_catalog."default" NOT NULL,
  team_id smallint NOT NULL,
  summoner_id integer NOT NULL,
  role roletype NOT NULL,
  champion_id smallint NOT NULL,
  kills smallint NOT NULL,
  deaths smallint NOT NULL,
  assists smallint NOT NULL,
  cs smallint NOT NULL,
  first_blood boolean NOT NULL,
  first_tower boolean NOT NULL,
  first_inhibitor boolean NOT NULL,
  largest_kill smallint NOT NULL,
  largest_spree smallint NOT NULL,
  tower_kills smallint NOT NULL,
  inhibitor_kills smallint NOT NULL,
  gold_earned integer NOT NULL,
  last_season ranktype NOT NULL,
  spell_d integer NOT NULL,
  spell_f integer NOT NULL,
  item_0 integer NOT NULL,
  item_1 integer NOT NULL,
  item_2 integer NOT NULL,
  item_3 integer NOT NULL,
  item_4 integer NOT NULL,
  item_5 integer NOT NULL,
  item_6 integer NOT NULL,
  gold_0_10 integer NOT NULL,
  gold_10_20 integer NOT NULL,
  xp_0_10 integer NOT NULL,
  xp_10_20 integer NOT NULL,
  double_kills smallint NOT NULL,
  triple_kills smallint NOT NULL,
  quadra_kills smallint NOT NULL,
  penta_kills smallint NOT NULL,
  CONSTRAINT matches_participants_pkey PRIMARY KEY (id),
  CONSTRAINT fk_matches_participants_match_id FOREIGN KEY (match_id, region)
    REFERENCES public.matches (id, region) MATCH SIMPLE
    ON UPDATE CASCADE
    ON DELETE CASCADE
);
