CREATE OR REPLACE FUNCTION new_game(
	_p1_id INTEGER DEFAULT NULL,
	_p2_id INTEGER DEFAULT NULL,
	_state game_state DEFAULT 'RUNNING'
)
RETURNS TABLE(success BOOLEAN, msg TEXT, id INTEGER) AS $$
DECLARE
	_p1_bot BOOLEAN NOT NULL := FALSE;
	_p2_bot BOOLEAN NOT NULL := FALSE;
	_type game_type NOT NULL := 'VS';
	new_game_id INTEGER;
BEGIN
	IF _p1_id IS NULL THEN
		_p1_bot := TRUE;
		_type = 'IA';
	END IF;
	IF _p2_id IS NULL THEN
		_p2_bot := TRUE;
		_type = 'IA';
	END IF;
	INSERT INTO games (p1_id, p2_id, state, p1_bot, p2_bot, type)
	VALUES (_p1_id, _p2_id, _state, _p1_bot, _p2_bot, _type)
	RETURNING id INTO new_game_id;

	RETURN QUERY SELECT TRUE, 'Game created successfully', new_game_id;
	
EXCEPTION
	WHEN OTHERS THEN
		RETURN QUERY SELECT FALSE, SQLERRM, NULL;
END;
$$ LANGUAGE plpgsql;




CREATE OR REPLACE FUNCTION score(
	_id INTEGER,
	_p1 BOOLEAN DEFAULT TRUE
)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM games WHERE id = _id) THEN
		RETURN QUERY SELECT FALSE, 'No game found to score';
	END IF;

	IF _p1 THEN
		UPDATE games SET p1_score = p1_score + 1
		WHERE id = _id;
	ELSE
		UPDATE games SET p2_score = p2_score + 1
		WHERE id = _id;
	END IF;
	RETURN QUERY SELECT TRUE, 'Game updated successfully';
	
EXCEPTION
	WHEN OTHERS THEN
		RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;




CREATE OR REPLACE FUNCTION delete_game(
	_id INTEGER
)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
	game_deleted BOOLEAN NOT NULL := FALSE;
BEGIN
	DELETE FROM users WHERE id = _id RETURNING TRUE INTO game_deleted;
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
