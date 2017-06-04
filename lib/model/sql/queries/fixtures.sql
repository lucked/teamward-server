CREATE TYPE rankType AS ENUM('UNRANKED','BRONZE','SILVER','GOLD','PLATINUM','DIAMOND','MASTER','CHALLENGER');
CREATE TYPE roleType AS ENUM('?','TOP','JUNGLE','MID','CARRY','SUPPORT'),

CREATE TABLE public.matches
(
  id bigint NOT NULL,
  region character varying(4) COLLATE pg_catalog."default" NOT NULL,
  winner integer NOT NULL,
  queue character varying(45) COLLATE pg_catalog."default" NOT NULL,
  map integer NOT NULL,
  season integer NOT NULL DEFAULT 7,
  patch_number integer NOT NULL DEFAULT 10,
  creation timestamp without time zone NOT NULL,
  duration integer NOT NULL,
  rank ranktype NOT NULL,
  CONSTRAINT matches_pkey PRIMARY KEY (id, region)
)

CREATE TABLE public.matches_participants
(
  id integer NOT NULL DEFAULT nextval('matches_participants_id_seq'::regclass),
  match_id bigint NOT NULL,
  region character varying COLLATE pg_catalog."default" NOT NULL,
  team_id integer NOT NULL,
  summoner_id integer NOT NULL,
  role roletype NOT NULL,
  champion_id integer NOT NULL,
  kills integer NOT NULL,
  deaths integer NOT NULL,
  assists integer NOT NULL,
  cs integer NOT NULL,
  first_blood integer NOT NULL,
  first_tower integer NOT NULL,
  first_inhibitor integer NOT NULL,
  largest_kill integer NOT NULL,
  largest_spree integer NOT NULL,
  tower_kills integer NOT NULL,
  inhibitor_kills integer NOT NULL,
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
  double_kills integer NOT NULL,
  triple_kills integer NOT NULL,
  quadra_kills integer NOT NULL,
  penta_kills integer NOT NULL,
  CONSTRAINT matches_participants_pkey PRIMARY KEY (id),
  CONSTRAINT fk_matches_participants_match_id FOREIGN KEY (match_id, region)
    REFERENCES public.matches (id, region) MATCH SIMPLE
    ON UPDATE CASCADE
    ON DELETE CASCADE
)
