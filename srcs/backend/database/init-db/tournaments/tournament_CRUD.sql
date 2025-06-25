CREATE OR REPLACE FUNCTION new_tournament(
	_name TEXT,
	_nbr_players INTEGER DEFAULT 1,
	_tournament_state tournament_state DEFAULT 'WAITING'
)
RETURNS TABLE(success BOOLEAN, message TEXT) AS $$
DECLARE
	_remaining_rounds INTEGER NOT NULL DEFAULT 1;
BEGIN
	_remaining_rounds = CEIL(LOG(2, _nbr_players));
	INSERT INTO tournaments (name, nbr_players, remaining_rounds, tournament_state)
	VALUES (_name, _nbr_players, _remaining_rounds, _tournament_state);
	
	RETURN QUERY SELECT TRUE, 'Tournament created successfully';

EXCEPTION
	WHEN unique_violation THEN
		IF SQLERRM LIKE '%tournaments_name_key%' THEN
			RETURN QUERY SELECT FALSE, 'Tournament name is already taken';
		ELSE
			RETURN QUERY SELECT FALSE, 'Unique constraint violation on tournament (not normal)';
		END IF;
	WHEN OTHERS THEN
		RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;