CREATE OR REPLACE FUNCTION join_tournament (
	_id INTEGER,
	_name TEXT DEFAULT 'tournament'
)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
	_tournament_id INTEGER;
BEGIN
	SELECT id INTO _tournament_id
	FROM tournaments
	WHERE name = _name;
	
	IF _tournament_id IS NULL THEN
		RETURN QUERY SELECT FALSE, 'Tournament not found';
		RETURN ;
	END IF;

	IF EXISTS (
		SELECT 1 FROM tournaments_players
		WHERE player_id = _id AND tournament_id = _tournament_id
	) THEN
		RETURN QUERY SELECT FALSE, 'User already joined this tournament';
		RETURN ;
	END IF;

	INSERT INTO tournaments_players (player_id, tournament_id)
	VALUES (_id, _tournament_id);

	UPDATE tournaments SET nbr_players = nbr_players + 1
	WHERE id = _tournament_id;

	RETURN QUERY SELECT TRUE, 'User joined successfully';
	

EXCEPTION
	WHEN OTHERS THEN
		RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION leave_tournament (
	_id INTEGER,
	_name TEXT DEFAULT 'tournament'
)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
	_tournament_id INTEGER;
	_player_deleted BOOLEAN;
BEGIN
	SELECT id INTO _tournament_id
	FROM tournaments
	WHERE name = _name;
	
	IF _tournament_id IS NULL THEN
		RETURN QUERY SELECT FALSE, 'Tournament not found';
		RETURN ;
	END IF;


	DELETE FROM tournaments_players WHERE player_id = _id AND tournament_id = _tournament_id RETURNING TRUE INTO _player_deleted;
	IF _player_deleted THEN
		UPDATE tournaments SET nbr_players = nbr_players - 1
		WHERE id = _tournament_id;
		RETURN QUERY SELECT TRUE, 'Player deleted successfully from tournament';
	ELSE
		RETURN QUERY SELECT FALSE, 'No player found for this tournament';
	END IF;

EXCEPTION
	WHEN OTHERS THEN
		RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;

