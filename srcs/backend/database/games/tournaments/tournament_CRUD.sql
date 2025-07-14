CREATE OR REPLACE FUNCTION new_tournament(
	_name TEXT DEFAULT 'tournament',
	_owner_id INTEGER
)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
	_total_rounds INTEGER NOT NULL DEFAULT 1;
BEGIN
	IF _name IS NULL THEN
		RETURN QUERY SELECT FALSE, 'Pls specify a tournament name not null';
		RETURN ;
	END IF;
	IF NOT EXISTS (
		SELECT 1 FROM users WHERE id = _id
	) THEN
		RETURN QUERY SELECT FALSE, FORMAT('User with id %s doesn''t exists', _id);
		RETURN ;
	END IF;

	INSERT INTO tournaments (name, owner_id)
	VALUES (_name, _owner_id);
	
	RETURN QUERY SELECT TRUE, 'Tournament created successfully';

EXCEPTION
	WHEN unique_violation THEN
		IF SQLERRM LIKE '%tournaments_name_key%' THEN
			RETURN QUERY SELECT FALSE, 'Tournament name is already in use';
		ELSE
			RETURN QUERY SELECT FALSE, SQLERRM;
		END IF;
	WHEN OTHERS THEN
		RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;


-- CREATE OR REPLACE FUNCTION init_tournament(_name TEXT)
-- RETURNS TABLE(success BOOLEAN, msg TEXT, brackets JSON) AS $$
-- DECLARE
-- 	_id INTEGER;
-- 	_round INTEGER;
-- 	_nbr_players INTEGER;
-- 	_min_players INTEGER;
-- 	_max_players INTEGER;
-- 	players_id INTEGER[];
-- 	_state TEXT;
-- BEGIN
-- 	IF _name IS NULL THEN
-- 		RETURN QUERY SELECT FALSE, 'Tournament name cant be null', '{}'::INTEGER[];
-- 		RETURN ;
-- 	END IF;

-- 	SELECT id, round, min_players, max_players, state INTO _id, _round, _min_players, _max_players, _state
-- 	FROM tournaments WHERE name = _name;
-- 	IF NOT FOUND THEN
-- 		RETURN QUERY SELECT FALSE, 'No tournament found to this name', '{}'::INTEGER[];
-- 		RETURN ;
-- 	END IF;
	
-- 	IF _state != 'PREP' THEN
-- 		RETURN QUERY SELECT FALSE, 'Can''t init tournaments: tournament isn''t in prepping phase anymore', '{}'::INTEGER[];
-- 		RETURN ;
-- 	END IF;

-- 	SELECT ARRAY_AGG(player_id)
-- 	INTO players_id
-- 	FROM tournaments_players
-- 	WHERE tournament_id = _id;

-- 	_nbr_players := array_length(players_id, 1);
-- 	IF _nbr_players IS NULL OR (_nbr_players < _min_players) OR (_nbr_players > _max_players) THEN
--     	RETURN QUERY SELECT FALSE, FORMAT('Players don''t match nbr of players required (%s players, min %s, max %s)', _nbr_players, _min_players, _max_players), '{}'::INTEGER[];
-- 		RETURN ;
-- 	END IF;

-- 	UPDATE tournaments
-- 	SET state = 'WAITING',
-- 		round = 1,
-- 		total_rounds = CEIL(LOG(2, nbr_players))
-- 	WHERE id = _id;

-- 	RETURN QUERY SELECT TRUE, 'Tournament initialized !', pair_tournament(_id, players_id);

-- 	(
--       SELECT json_agg(
--         json_build_object(
--           'round', round,
--           'games', json_agg(to_json(g.*) ORDER BY g.id)
--         )
--         ORDER BY round
--       )
--       FROM (
--         SELECT DISTINCT round
--         FROM games
--         WHERE tournament_id = _tournament_id
--         ORDER BY round
--       ) rounds_table
--       JOIN LATERAL (
--         SELECT * FROM games games_table
--         WHERE games_table.tournament_id = _tournament_id AND games_table.round = rounds_table.round
--       ) games_table ON TRUE
--       GROUP BY rounds_table.round
--     );
-- EXCEPTION
-- 	WHEN OTHERS THEN
--     	RETURN QUERY SELECT FALSE, SQLERRM, '{}'::INTEGER[];
-- END;
-- $$ LANGUAGE plpgsql;




CREATE OR REPLACE FUNCTION delete_tournament(_name TEXT)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
	tournament_deleted BOOLEAN := FALSE;
BEGIN
	DELETE FROM tournaments WHERE name = _name AND (state != 'RUNNING') RETURNING TRUE INTO tournament_deleted;
	IF tournament_deleted THEN
		RETURN QUERY SELECT TRUE, 'Tournament deleted successfully';
	ELSE
		RETURN QUERY SELECT FALSE, 'Tournament either doesnt exist or is running (cant delete running tournaments) (delete fail)';
	END IF;
EXCEPTION
	WHEN OTHERS THEN
    	RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;

