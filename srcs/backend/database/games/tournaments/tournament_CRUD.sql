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



CREATE OR REPLACE FUNCTION start_tournament(_name TEXT)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
	_nbr_players INTEGER;
	_min_players INTEGER;
BEGIN
	SELECT nbr_players, min_players INTO _nbr_players, _min_players
	FROM tournaments
	WHERE name = _name;
	IF NOT FOUND THEN
		RETURN QUERY SELECT FALSE, 'Tournament with this name not found';
		RETURN ;
	END IF;
	IF (_min_players > _nbr_players) OR (_nbr_players < 2) THEN
		RETURN QUERY SELECT FALSE, 'Tournament doesn''t have enough players to start';
		RETURN ;
	END IF;

	UPDATE tournaments
	SET state = 'RUNNING',
		round = 1,
		total_rounds = CEIL(LOG(2, nbr_players))
	WHERE name = _name;

	PERFORM pair_tournament(_name);

	RETURN QUERY SELECT TRUE, 'Tournament started !';
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
	DELETE FROM tournaments WHERE name = _name RETURNING TRUE INTO tournament_deleted;
	IF tournament_deleted THEN
		RETURN QUERY SELECT TRUE, 'Tournament deleted successfully';
	ELSE
		RETURN QUERY SELECT FALSE, 'No tournament found with that name (delete fail)';
	END IF;
EXCEPTION
	WHEN OTHERS THEN
    	RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;

