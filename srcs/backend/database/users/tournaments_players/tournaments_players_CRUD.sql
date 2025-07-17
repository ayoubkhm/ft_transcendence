CREATE OR REPLACE FUNCTION join_tournament (
	_id INTEGER,
	_name TEXT DEFAULT 'tournament'
)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
	_tournament_id INTEGER;
	_tournament_state tournament_state;
	_success BOOLEAN;
	_msg TEXT;
	_nbr_players INTEGER;
	_min_players INTEGER;
BEGIN
	SELECT id, state, min_players INTO _tournament_id, _tournament_state, _min_players
	FROM tournaments
	WHERE name = _name;
	
	IF _tournament_id IS NULL THEN
		RETURN QUERY SELECT FALSE, 'Tournament not found';
		RETURN ;
	END IF;

	IF _tournament_state != 'LOBBY' THEN
		RETURN QUERY SELECT FALSE, 'Tournament isnt prepping, cant join';
		RETURN ;
	END IF;

	IF EXISTS (
		SELECT 1 FROM tournaments_players
		WHERE player_id = _id AND tournament_id = _tournament_id
	) THEN
		RETURN QUERY SELECT FALSE, 'User already joined this tournament';
		RETURN ;
	END IF;

	UPDATE tournaments SET nbr_players = nbr_players + 1
	WHERE id = _tournament_id
	RETURNING nbr_players INTO _nbr_players;

	INSERT INTO tournaments_players (player_id, tournament_id)
	VALUES (_id, _tournament_id);


	IF _nbr_players >= _min_players THEN
		PERFORM update_brackets(_tournament_id);
		RETURN QUERY SELECT TRUE, 'User joined successfully, brackets updated';
		RETURN ;
	END IF;

	RETURN QUERY SELECT TRUE, 'User joined successfully (brackets not update, not enough players)';

EXCEPTION
	WHEN OTHERS THEN
		RETURN QUERY SELECT FALSE, FORMAT('User joined, but bracekts failed: %s', SQLERRM);
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION leave_tournament (
	_id INTEGER,
	_name TEXT DEFAULT 'tournament'
)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
	_tournament_id INTEGER;
	_state tournament_state;
	_player_deleted BOOLEAN;
	_nbr_players INTEGER;
	_min_players INTEGER;
BEGIN
	SELECT id, state INTO _tournament_id, _state
	FROM tournaments
	WHERE name = _name;
	
	IF NOT FOUND THEN
		RETURN QUERY SELECT FALSE, 'Tournament not found';
		RETURN ;
	END IF;

	IF _state != 'LOBBY' THEN
		RETURN QUERY SELECT FALSE, 'Can''t leave tournament: isnt prepping anymore';
		RETURN ;
	END IF;

	DELETE FROM tournaments_players
	WHERE player_id = _id
		AND tournament_id = _tournament_id
	RETURNING TRUE INTO _player_deleted;
	
	IF _player_deleted THEN
		UPDATE tournaments SET nbr_players = nbr_players - 1
		WHERE id = _tournament_id
		RETURNING nbr_players, min_players INTO _nbr_players, _min_players;

		IF _nbr_players >= _min_players THEN
			PERFORM update_brackets(_tournament_id);
			RETURN QUERY SELECT TRUE, 'Player deleted successfully from tournament, brackets updated';
		ELSE
			DELETE FROM games
			WHERE tournament_id = _tournament_id;
			RETURN QUERY SELECT TRUE, 'Player deleted successfully from tournament, brackets deleted';
		END IF;

	ELSE
		RETURN QUERY SELECT FALSE, 'Player not found in tournament';
	END IF;

EXCEPTION
	WHEN OTHERS THEN
		RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;

