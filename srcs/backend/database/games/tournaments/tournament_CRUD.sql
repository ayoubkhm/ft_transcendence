CREATE OR REPLACE FUNCTION new_tournament(
	_name TEXT DEFAULT 'tournament',
	_nbr_players INTEGER DEFAULT 1,
	_state tournament_state DEFAULT 'WAITING'
)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
	_total_rounds INTEGER NOT NULL DEFAULT 1;
BEGIN
	IF _nbr_players IS NULL THEN
		RETURN QUERY SELECT FALSE, 'Pls specify a number of players not null (and >= 1)';
	ELSIF _name IS NULL THEN
		RETURN QUERY SELECT FALSE, 'Pls specify a name not null';
	ELSIF _state IS NULL THEN
		RETURN QUERY SELECT FALSE, 'Pls specify a tournament state not null';
	END IF;
	_total_rounds := CEIL(LOG(2, _nbr_players));
	INSERT INTO tournaments (name, nbr_players, remaining_rounds, total_rounds, state)
	VALUES (_name, _nbr_players, _total_rounds, _total_rounds, _state);
	
	RETURN QUERY SELECT TRUE, 'Tournament created successfully';

EXCEPTION
	WHEN OTHERS THEN
		RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;
