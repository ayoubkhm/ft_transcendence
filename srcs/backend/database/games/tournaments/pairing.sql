CREATE OR REPLACE FUNCTION pair_tournament (
	_name TEXT DEFAULT 'tournament'
)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
	_total_rounds INTEGER NOT NULL DEFAULT 1;
	_id INTEGER;
BEGIN
	IF _name IS NULL THEN
		RETURN QUERY SELECT FALSE, 'Pls specify a tournament name not null';
	END IF;
	
	IF NOT EXISTS (SELECT id, round INTO _id FROM tournaments WHERE name = _name) THEN
		RETURN QUERY SELECT FALSE, 'No tournament found to this name';
	END IF;

EXCEPTION
	WHEN OTHERS THEN
		RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;





CREATE OR REPLACE FUNCTION next_round (
	_name NAME DEFAULT 'tournament'
)
DECLARE
	_id INT;
	_total_rounds INTEGER;
	_round INTEGER;
	_pairing INTEGER;
	_state tournament_state;
	qualified INTEGER[];
	i INTEGER;
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
BEGIN
	IF _name IS NULL THEN
		RETURN QUERY SELECT FALSE, 'Pls specify a tournament name not null';
	END IF;
	
	IF NOT EXISTS (SELECT id, round, total_rounds, pairing, tournament_state INTO _id, _round, _total_rounds, _pairing, _tournament_state FROM tournaments WHERE name = _name) THEN
		RETURN QUERY SELECT FALSE, 'No tournament found to this name';
	END IF;

	IF _round >= _total_rounds AND _tournament_state != 'WAITING' THEN
		RETURN QUERY SELECT FALSE, 'Tournament is over !';
	END IF;

	SELECT ARRAY_AGG(player_id)
	INTO qualified
	FROM tournaments_players
	WHERE tournament_id = _tournament_id
		AND round = _round
		AND current_round_over = TRUE
		AND stil_in = TRUE;

	total

EXCEPTION
	WHEN OTHERS THEN
		RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;

