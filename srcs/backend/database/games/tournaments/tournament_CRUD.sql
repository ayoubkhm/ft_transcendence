CREATE OR REPLACE FUNCTION new_tournament(
	_name TEXT DEFAULT 'tournament'
)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
	_total_rounds INTEGER NOT NULL DEFAULT 1;
BEGIN
	IF _name IS NULL THEN
		RETURN QUERY SELECT FALSE, 'Pls specify a tournament name not null';
	END IF;
	INSERT INTO tournaments (name)
	VALUES (_name);
	
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


CREATE OR REPLACE FUNCTION init_tournament(_name TEXT)
RETURNS TABLE(success BOOLEAN, msg TEXT, games_id INTEGER[]) AS $$
DECLARE
	_id INTEGER;
	_round INTEGER;
	_nbr_players INTEGER;
	_min_players INTEGER;
	_max_players INTEGER;
	players_id INTEGER[];
BEGIN
	IF _name IS NULL THEN
		RETURN QUERY SELECT FALSE, 'Tournament name cant be null', '{}'::INTEGER[];
		RETURN ;
	END IF;

	SELECT id, round, min_players, max_players INTO _id, _round, _min_players, _max_players
	FROM tournaments WHERE name = _name;
	IF NOT FOUND THEN
		RETURN QUERY SELECT FALSE, 'No tournament found to this id', '{}'::INTEGER[];
		RETURN ;
	END IF;
	
	IF _round != 0 THEN
		RETURN QUERY SELECT FALSE, FORMAT('Can''t init tournaments: round (%s) > 0', _round), '{}'::INTEGER[];
		RETURN ;
	END IF;

	SELECT ARRAY_AGG(player_id)
	INTO players_id
	FROM tournaments_players
	WHERE tournament_id = _id;

	_nbr_players := array_length(players_id, 1);
	_max_players := GREATEST(_max_players, 2);
	_min_players := GREATEST(2, _min_players);
	IF _nbr_players IS NULL OR (_nbr_players < _min_players) OR (_nbr_players > _max_players) THEN
    	RETURN QUERY SELECT FALSE, FORMAT('Players don''t match nbr of players required (%s players, min %s, max %s)', _nbr_players, _min_players, _max_players), '{}'::INTEGER[];
		RETURN ;
	END IF;

	UPDATE tournaments
	SET state = 'WAITING',
		round = 1,
		total_rounds = CEIL(LOG(2, nbr_players))
	WHERE id = _id;

	RETURN QUERY SELECT TRUE, 'Tournament initialized !', pair_tournament(_id, players_id);
EXCEPTION
	WHEN OTHERS THEN
    	RETURN QUERY SELECT FALSE, SQLERRM, '{}'::INTEGER[];
END;
$$ LANGUAGE plpgsql;



CREATE OR REPLACE FUNCTION next_round (
	_name NAME DEFAULT 'tournament'
)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
	_id INT;
	_total_rounds INTEGER;
	_round INTEGER;
	_pairing INTEGER;
	_state tournament_state;
	round_games INTEGER[];
	i INTEGER;
BEGIN
	IF _name IS NULL THEN
		RETURN QUERY SELECT FALSE, 'Pls specify a tournament name not null';
		RETURN ;
	END IF;
	
	SELECT id, round, pairing, state
	INTO _id, _round, _pairing, _state
	FROM tournaments
	WHERE name = _name;

	IF NOT FOUND THEN
		RETURN QUERY SELECT FALSE, 'No tournament found to this name';
		RETURN ;
	END IF;

	

EXCEPTION
	WHEN OTHERS THEN
		RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;



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

