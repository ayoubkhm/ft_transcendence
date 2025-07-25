CREATE OR REPLACE FUNCTION pause_game (
	_id INTEGER
)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
	_state game_state;
BEGIN
	IF _id IS NULL THEN
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
	IF _id IS NULL THEN
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
	_p1_id INTEGER;
	_p1_winnerof INTEGER;
	_p2_id INTEGER;
	_p2_winnerof INTEGER;
BEGIN
	IF _id IS NULL THEN
		RETURN QUERY SELECT FALSE, 'Pls specify a id game not null';
		RETURN ;
	END IF;
	
	SELECT state, p1_id, p2_id, p1_winnerof, p2_winnerof
	INTO _state, _p1_id, _p2_id, _p1_winnerof, _p2_winnerof
	FROM games
	WHERE id = _id;
	
	IF NOT FOUND THEN
		RETURN QUERY SELECT FALSE, 'Game with id % not found', _id;
		RETURN ;
	END IF;

	IF _state != 'WAITING' THEN
        RETURN QUERY SELECT FALSE, 'Can''t start game that isnt preping';
        RETURN ;
    END IF;

	IF (_p1_id IS NULL AND (_p1_winnerof IS NOT NULL)) THEN
		RETURN QUERY SELECT FALSE, FORMAT('Can''t start game: waiting for result of game %s to know who p1 is', _p1_winnerof);
		RETURN ;
	END IF;

	IF (_p2_id IS NULL AND (_p2_winnerof IS NOT NULL)) THEN
		RETURN QUERY SELECT FALSE, FORMAT('Can''t start game: waiting for result of game %s to know who p2 is', _p2_winnerof);
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
	winner_is_p1 BOOLEAN DEFAULT TRUE,
	_p1_score INTEGER DEFAULT NULL,
	_p2_score INTEGER DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, msg TEXT, tid INTEGER, tround INTEGER) AS $$
DECLARE
	_state game_state;
	_p1_id INTEGER;
	_p2_id INTEGER;
	old_p1_score INTEGER;
	old_p2_score INTEGER;
	_tournament_round INTEGER;
	_tournament_id INTEGER;
BEGIN
	IF _id IS NULL THEN
		RETURN QUERY SELECT FALSE, 'Pls specify a id game not null', NULL::INTEGER AS tid, NULL::INTEGER AS tround;
		RETURN ;
	END IF;
	
	SELECT state, p1_id, p2_id, tournament_round, tournament_id, p1_score, p2_score
	INTO _state, _p1_id, _p2_id, _tournament_round, _tournament_id, old_p1_score, old_p2_score
	FROM games
	WHERE id = _id;

	IF NOT FOUND THEN
		RETURN QUERY SELECT FALSE, FORMAT('Game with id %s not found', _id), NULL::INTEGER AS tid, NULL::INTEGER AS tround;
		RETURN ;
	END IF;

	IF _state = 'OVER' THEN
        RETURN QUERY SELECT FALSE, 'Can''t win game that is already over', NULL::INTEGER AS tid, NULL::INTEGER AS tround;
        RETURN ;
    END IF;

	IF _p1_score IS NULL THEN
		_p1_score = old_p1_score;
	END IF;
	IF _p2_score IS NULL THEN
		_p2_score = old_p2_score;
	END IF;

	UPDATE games
	SET state = 'OVER',
		winner = winner_is_p1,
		p1_score = _p1_score,
		p2_score = _p2_score
	WHERE id = _id;
	
	IF winner_is_p1 THEN
		UPDATE games
		SET p1_id = _p1_id
		WHERE p1_winnerof = _id;
		
		UPDATE games
		SET p2_id = _p1_id
		WHERE p2_winnerof = _id;
	ELSE
		UPDATE games
		SET p1_id = _p2_id
		WHERE p1_winnerof = _id;
		
		UPDATE games
		SET p2_id = _p2_id
		WHERE p2_winnerof = _id;
	END IF;

	IF _tournament_round IS NOT NULL THEN
		IF NOT EXISTS(
			SELECT id
			FROM games
			WHERE tournament_id = _tournament_id
				AND state != 'OVER'
				AND tournament_round = _tournament_round
		) THEN
			PERFORM next_round(_tournament_id);
			_tournament_round := _tournament_round + 1;
		END IF;
	END IF;

	RETURN QUERY SELECT TRUE, 'Game successfully won', _tournament_id as tid, _tournament_round AS tround;
	
EXCEPTION
	WHEN OTHERS THEN
		RETURN QUERY SELECT FALSE, SQLERRM, NULL::INTEGER AS tid, NULL::INTEGER AS tround;
END;
$$ LANGUAGE plpgsql;
