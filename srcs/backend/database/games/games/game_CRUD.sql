CREATE OR REPLACE FUNCTION new_game(
	_p1_id INTEGER DEFAULT NULL,
	_p2_id INTEGER DEFAULT NULL,
	_state game_state DEFAULT 'RUNNING',
	_type game_type DEFAULT 'VS',
	_tournament_id INTEGER DEFAULT NULL,
	_tournament_round INTEGER DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, msg TEXT, new_game_id INTEGER) AS $$
DECLARE
	_p1_bot BOOLEAN NOT NULL := FALSE;
	_p2_bot BOOLEAN NOT NULL := FALSE;
    _final_type game_type := _type;
	_new_game_id INTEGER;
BEGIN
	IF _p1_id IS NULL THEN
		_p1_bot := TRUE;
	END IF;
	IF _p2_id IS NULL THEN
		_p2_bot := TRUE;
	END IF;

	IF (_p1_bot = TRUE OR _p2_bot = TRUE) AND _final_type != 'TOURNAMENT' THEN
		_final_type := 'IA';
	END IF;

	INSERT INTO games (p1_id, p2_id, state, p1_bot, p2_bot, type, tournament_id, tournament_round)
	VALUES (_p1_id, _p2_id, _state, _p1_bot, _p2_bot, _final_type, _tournament_id, _tournament_round)
	RETURNING id INTO _new_game_id;

	RETURN QUERY SELECT TRUE, 'Game created successfully', _new_game_id;
	
EXCEPTION
	WHEN OTHERS THEN
		RETURN QUERY SELECT FALSE, SQLERRM, NULL::INTEGER;
END;
$$ LANGUAGE plpgsql;



CREATE OR REPLACE FUNCTION delete_game(
	_id INTEGER
)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
	game_deleted BOOLEAN NOT NULL := FALSE;
BEGIN
	DELETE FROM games WHERE id = _id RETURNING TRUE INTO game_deleted;
	IF game_deleted THEN
		RETURN QUERY SELECT TRUE, 'Game deleted successfully';
	ELSE
		RETURN QUERY SELECT FALSE, 'No game found to delete';
	END IF;
	
EXCEPTION
	WHEN OTHERS THEN
		RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;



CREATE OR REPLACE FUNCTION get_game_state(
	_id INTEGER
)
RETURNS TABLE(success BOOLEAN, msg TEXT, gstate game_state) AS $$
DECLARE
	_state game_state;
BEGIN
	IF _id IS NULL THEN
		RETURN QUERY SELECT FALSE, 'Game id cant be null', NULL::game_state;
		RETURN ;
	END IF;

	SELECT state INTO _state
	FROM games
	WHERE id = _id;

	IF NOT FOUND THEN
		RETURN QUERY SELECT FALSE, FORMAT('Game with id %s not found (get_game_state fail)', _id), NULL::game_state;
		RETURN ;
	END IF;

	RETURN QUERY SELECT TRUE, 'Game state retrieved', _state;
	
EXCEPTION
	WHEN OTHERS THEN
		RETURN QUERY SELECT FALSE, SQLERRM, NULL::game_state;
END;
$$ LANGUAGE plpgsql;

