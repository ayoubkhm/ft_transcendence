CREATE OR REPLACE FUNCTION start_tournament(
	_name TEXT)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
	_id INTEGER;
	_round INTEGER;
	_state tournament_state;
	_nbr_players INTEGER;
	_min_players INTEGER;
BEGIN
	IF _name IS NULL THEN
		RETURN QUERY SELECT FALSE, 'Tournament name cant be null';
		RETURN ;
	END IF;

	SELECT id, round, state, min_players, nbr_players INTO _id, _round, _state, _min_players, _nbr_players
	FROM tournaments WHERE name = _name;
	IF NOT FOUND THEN
		RETURN QUERY SELECT FALSE, 'No tournament found to this name';
		RETURN ;
	END IF;
	
	IF _state != 'LOBBY' THEN
		RETURN QUERY SELECT FALSE, 'Can''t start tournaments: tournament isn''t in prep phase';
		RETURN ;
	END IF;

	IF (_nbr_players < _min_players) THEN
		RETURN QUERY SELECT FALSE, FORMAT('Not enough players to start tournament: %s/%s', _nbr_players, _min_players);
		RETURN ;
	END IF;

	-- Check if all players are ready
	IF EXISTS (
		SELECT 1 FROM tournaments_players
		WHERE tournament_id = _id AND is_ready = FALSE
	) THEN
		RETURN QUERY SELECT FALSE, 'Not all players are ready.';
		RETURN ;
	END IF;

	UPDATE tournaments
	SET state = 'RUNNING'
	WHERE id = _id;

    UPDATE games
    SET state = 'RUNNING'
    WHERE tournament_id = _id
        AND tournament_round = _round;

	RETURN QUERY SELECT TRUE, 'Tournament started !';

EXCEPTION
	WHEN OTHERS THEN
    	RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;

