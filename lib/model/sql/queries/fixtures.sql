CREATE TABLE `matches` (
  `id` bigint(20) unsigned NOT NULL,
  `region` varchar(4) NOT NULL,
  `winner` tinyint(3) unsigned NOT NULL,
  `queue` varchar(45) NOT NULL,
  `map` tinyint(3) unsigned NOT NULL,
  `patch` varchar(15) NOT NULL,
  `creation` datetime NOT NULL,
  `duration` int(10) unsigned NOT NULL,
  `rank` enum('UNRANKED','BRONZE','SILVER','GOLD','PLATINUM','DIAMOND','MASTER','CHALLENGER') NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `matches_participants` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `match_id` bigint(20) unsigned NOT NULL,
  `team_id` tinyint(3) unsigned NOT NULL,
  `summoner_id` int(10) unsigned NULL,
  `role` enum('?','TOP','JUNGLE','MID','CARRY','SUPPORT') NOT NULL,
  `champion_id` int(10) unsigned NOT NULL,
  `kills` int(10) unsigned NOT NULL,
  `deaths` int(10) unsigned NOT NULL,
  `assists` int(10) unsigned NOT NULL,
  `cs` int(10) unsigned NOT NULL,
  `first_blood` tinyint(3) unsigned NOT NULL,
  `first_tower` tinyint(3) unsigned NOT NULL,
  `first_inhibitor` tinyint(3) unsigned NOT NULL,
  `largest_kill` int(10) unsigned NOT NULL,
  `largest_spree` int(10) unsigned NOT NULL,
  `tower_kills` int(10) unsigned NOT NULL,
  `inhibitor_kills` int(10) unsigned NOT NULL,
  `gold_earned` int(10) unsigned NOT NULL,
  `last_season` enum('UNRANKED','BRONZE','SILVER','GOLD','PLATINUM','DIAMOND','MASTER','CHALLENGER') NOT NULL,
  `spell_d` int(10) unsigned NOT NULL,
  `spell_f` int(10) unsigned NOT NULL,
  `item_0` int(10) unsigned NOT NULL,
  `item_1` int(10) unsigned NOT NULL,
  `item_2` int(10) unsigned NOT NULL,
  `item_3` int(10) unsigned NOT NULL,
  `item_4` int(10) unsigned NOT NULL,
  `item_5` int(10) unsigned NOT NULL,
  `item_6` int(10) unsigned NOT NULL,
  `gold_0_10` int(10) unsigned NOT NULL,
  `gold_10_20` int(10) unsigned NOT NULL,
  `xp_0_10` int(10) unsigned NOT NULL,
  `xp_10_20` int(10) unsigned NOT NULL,
  `double_kills` int(10) unsigned NOT NULL,
  `triple_kills` int(10) unsigned NOT NULL,
  `quadra_kills` int(10) unsigned NOT NULL,
  `penta_kills` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_matches_participants_match_id` (`match_id`),
  KEY `idx_matches_participants_summoner_id` (`summoner_id`),
  KEY `idx_matches_participants_match_id_role_team_id` (`match_id`,`role`,`team_id`),
  KEY `idx_matches_participants_role_champion_id` (`champion_id`,`role`),
  CONSTRAINT `fk_matches_participants_match_id` FOREIGN KEY (`match_id`) REFERENCES `matches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
