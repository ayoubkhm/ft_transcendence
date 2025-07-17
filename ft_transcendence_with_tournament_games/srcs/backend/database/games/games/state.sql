
CREATE OR REPLACE FUNCTION abandon_game (
	_id INTEGER,
    is_p1 BOOLEAN DEFAULT TRUE
)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
	_state game_state;
BEGIN
	IF _name IS NULL THEN
		RETURN QUERY SELECT FALSE, 'Pls specify a id game not null';
		RETURN ;
	END IF;
	
	SELECT state
	INTO _state
	FROM games
	WHERE id = _id;

	IF NOT FOUND THEN
		RETURN QUERY SELECT FALSE, 'Game with id % not found', _id;
		RETURN ;
	END IF;

	IF _state = 'OVER' THEN
        RETURN QUERY SELECT 'Can''t abandon game that is already over';
        RETURN ;
    END IF;

    IF is_p1 THEN
        UPDATE games
        SET winner = TRUE,
            state = 'OVER'
        WHERE id = _id;
    ELSE
        UPDATE games
        SET winner = FALSE,
            state = 'OVER'
        WHERE id = _id;
    END IF;

	RETURN QUERY SELECT TRUE, 'Game successfully abandonned';

EXCEPTION
	WHEN OTHERS THEN
		RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION pause_game (
	_id INTEGER
)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
	_state game_state;
BEGIN
	IF _name IS NULL THEN
		RETURN QUERY SELECT FALSE, 'Pls specify a id game not null';
		RETURN ;
	END IF;
	
	SELECT state
	INTO _state
	FROM games
	WHERE id = _id;

	IF NOT FOUND THEN
		RETURN QUERY SELECT FALSE, 'Game with id % not found', _id;
		RETURN ;
	END IF;

	IF _state != 'RUNNING' THEN
        RETURN QUERY SELECT 'Can''t pause game : is %', _state;
        RETURN ;
    END IF;

    UPDATE games
    SET state = 'PAUSE'
    WHERE id = _id;

	RETURN QUERY SELECT TRUE, 'Game successfully paused';
    
EXCEPTION
	WHEN OTHERS THEN
		RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION unpause_game (
	_id INTEGER
)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
	_state game_state;
BEGIN
	IF _name IS NULL THEN
		RETURN QUERY SELECT FALSE, 'Pls specify a id game not null';
		RETURN ;
	END IF;
	
	SELECT state
	INTO _state
	FROM games
	WHERE id = _id;

	IF NOT FOUND THEN
		RETURN QUERY SELECT FALSE, 'Game with id % not found', _id;
		RETURN ;
	END IF;

	IF _state != 'PAUSE' THEN
        RETURN QUERY SELECT 'Can''t unpause game : is %', _state;
        RETURN ;
    END IF;

    UPDATE games
    SET state = 'RUNNING'
    WHERE id = _id;
    
	RETURN QUERY SELECT TRUE, 'Game successfully unpaused';

EXCEPTION
	WHEN OTHERS THEN
		RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION start_game (
	_id INTEGER
)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
	_state game_state;
BEGIN
	IF _name IS NULL THEN
		RETURN QUERY SELECT FALSE, 'Pls specify a id game not null';
		RETURN ;
	END IF;
	
	SELECT state
	INTO _state
	FROM games
	WHERE id = _id;
	
	IF NOT FOUND THEN
		RETURN QUERY SELECT FALSE, 'Game with id % not found', _id;
		RETURN ;
	END IF;

	IF _state != 'WAITING' THEN
        RETURN QUERY SELECT 'Can''t start game that isnt preping';
        RETURN ;
    END IF;

    UPDATE games
    SET state = 'RUNNING'
    WHERE id = _id;
	RETURN QUERY SELECT TRUE, 'Game successfully started';

EXCEPTION
	WHEN OTHERS THEN
		RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION win_game (
	_id INTEGER,
	winner_is_p1 BOOLEAN DEFAULT TRUE
)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
	_state game_state;
BEGIN
	IF _name IS NULL THEN
		RETURN QUERY SELECT FALSE, 'Pls specify a id game not null';
		RETURN ;
	END IF;
	
	SELECT state
	INTO _state
	FROM games
	WHERE id = _id;

	IF NOT FOUND THEN
		RETURN QUERY SELECT FALSE, 'Game with id % not found', _id;
		RETURN ;
	END IF;

	IF _state = 'OVER' THEN
        RETURN QUERY SELECT 'Can''t win game that is already over';
        RETURN ;
    END IF;

	IF winner_is_p1 THEN
	    UPDATE games
    	SET state = 'OVER',
			winner = TRUE
		WHERE id = _id;
	ELSE
		UPDATE games
    	SET state = 'OVER'
			winner = FALSE
		WHERE id = _id;
	END IF;

	RETURN QUERY SELECT TRUE, 'Game successfully won';
	
EXCEPTION
	WHEN OTHERS THEN
		RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;
