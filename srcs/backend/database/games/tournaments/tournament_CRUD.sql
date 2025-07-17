CREATE OR REPLACE FUNCTION new_tournament(
	_name TEXT,
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
	IF _owner_id IS NULL THEN
		RETURN QUERY SELECT FALSE, 'Pls specify a tournament owner id not null';
		RETURN ;
	END IF;

	IF NOT EXISTS (
		SELECT 1 FROM users WHERE id = _owner_id
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


CREATE OR REPLACE FUNCTION set_tournament_name(_id INTEGER, _name TEXT)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
BEGIN
	IF _name IS NULL OR LENGTH(TRIM(_name)) = 0 THEN
		RETURN QUERY SELECT FALSE, 'Tournament name cannot be empty';
		RETURN;
	END IF;

	UPDATE tournaments
	SET name = _name
	WHERE id = _id;

	IF NOT FOUND THEN
		RETURN QUERY SELECT FALSE, 'Tournament not found';
		RETURN;
	END IF;

	RETURN QUERY SELECT TRUE, 'Tournament name updated';
EXCEPTION
	WHEN OTHERS THEN
    	RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION set_tournament_min_players(_id INTEGER, _min INTEGER)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
BEGIN
	IF _min IS NULL OR _min < 2 THEN
		RETURN QUERY SELECT FALSE, 'Minimum players must be >= 2';
		RETURN;
	END IF;

	UPDATE tournaments
	SET min_players = _min
	WHERE id = _id;

	IF NOT FOUND THEN
		RETURN QUERY SELECT FALSE, 'Tournament not found';
		RETURN;
	END IF;

	RETURN QUERY SELECT TRUE, 'Minimum players updated';
EXCEPTION
	WHEN OTHERS THEN
    	RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION set_tournament_max_players(_id INTEGER, _max INTEGER)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
BEGIN
	IF _max IS NULL OR _max < 2 THEN
		RETURN QUERY SELECT FALSE, 'Maximum players must be >= 2';
		RETURN;
	END IF;

	UPDATE tournaments
	SET max_players = _max
	WHERE id = _id;

	IF NOT FOUND THEN
		RETURN QUERY SELECT FALSE, 'Tournament not found';
		RETURN;
	END IF;

	RETURN QUERY SELECT TRUE, 'Maximum players updated';
EXCEPTION
	WHEN OTHERS THEN
    	RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;



CREATE OR REPLACE FUNCTION next_round(_id INTEGER)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
	_round INTEGER;
	_total_rounds INTEGER;
	_winner_id INTEGER;
	round_games jsonb;
BEGIN
	SELECT round, total_rounds INTO _round, _total_rounds
	FROM tournaments
	WHERE id = _id;

	IF NOT FOUND THEN
		RETURN QUERY SELECT FALSE, FORMAT('Tournament with id %s not found', _id);
		RETURN ; 
	END IF;

	IF EXISTS(
		SELECT id
		FROM games
		WHERE tournament_id = _id
			AND state != 'OVER'
			AND tournament_round = _round
	) THEN
		RETURN QUERY SELECT FALSE, 'All this round games havent finished, can''t go to next round';
		RETURN ;
	END IF;

	SELECT jsonb_agg(jsonb_build_object(
		'p1_id', p1_id,
		'p2_id', p2_id,
		'winner', winner
	)) INTO round_games
	FROM games
	WHERE tournament_round = _round
		AND tournament_id = _id;

	IF (jsonb_array_length(round_games) = 1) THEN
		IF ((round_games -> 0) ->> 'winner')::BOOLEAN THEN
			_winner_id := ((round_games -> 0) ->> 'p1_id')::INTEGER;
		ELSE
			_winner_id := ((round_games -> 0) ->> 'p2_id')::INTEGER;
		END IF;

		UPDATE tournaments
		SET state = 'OVER',
			winner_id = _winner_id
		WHERE id = _id;
	ELSE
		UPDATE tournaments
		SET round = _round + 1
		WHERE id = _id;

		UPDATE games
		SET state = 'RUNNING'
		WHERE tournament_id = _id
			AND tournament_round = _round + 1;
	END IF;		

EXCEPTION
	WHEN OTHERS THEN
    	RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;
