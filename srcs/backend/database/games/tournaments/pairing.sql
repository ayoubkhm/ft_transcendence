CREATE OR REPLACE FUNCTION pair_tournament (
	_name TEXT DEFAULT 'tournament'
)
RETURNS TABLE(success BOOLEAN, msg TEXT, games_id INTEGER[]) AS $$
DECLARE
	_total_rounds INTEGER NOT NULL DEFAULT 1;
	_id INTEGER;
	_round INTEGER;
	players_id INTEGER[];
	rplayers_id INTEGER[];
	brackets_games_id INTEGER[];
	bracket_game_id INTEGER;
	i INTEGER;
BEGIN
	IF _name IS NULL THEN
		RETURN QUERY SELECT FALSE, 'Pls specify a tournament name not null', '{}'::INTEGER[];
		RETURN ;
	END IF;
	
	SELECT id, round INTO _id, _round FROM tournaments WHERE name = _name;
	IF NOT FOUND THEN
		RETURN QUERY SELECT FALSE, 'No tournament found to this name', '{}'::INTEGER[];
		RETURN ;
	END IF;

	SELECT ARRAY_AGG(player_id)
	INTO players_id
	FROM tournaments_players
	WHERE tournament_id = _id;

	IF array_length(players_id, 1) IS NULL OR array_length(players_id, 1) < 2 THEN
    	RETURN QUERY SELECT FALSE, 'Not enough players in this tournament', '{}'::INTEGER[];
		RETURN ;
	END IF;

	SELECT ARRAY_AGG(player_id ORDER BY random())
	INTO rplayers_id
	FROM unnest(players_id) AS player_id;

	RAISE NOTICE 'Players order: %', rplayers_id;

	i := 1;
	WHILE i < array_length(rplayers_id, 1) LOOP
		RAISE NOTICE 'LOOP 1: % % %', i, rplayers_id[i], rplayers_id[i + 1];
    	INSERT INTO games (p1_id, p2_id, tournament_id, tournament_round, type)
    	VALUES (rplayers_id[i], rplayers_id[i + 1], _id, _round, 'TOURNAMENT')
    	RETURNING id INTO bracket_game_id;

    	brackets_games_id := array_append(brackets_games_id, bracket_game_id);
    	i := i + 2;
	END LOOP;

	IF array_length(rplayers_id, 1) % 2 = 1 THEN
		INSERT INTO games (p1_id, p2_bot, tournament_id, tournament_round, type)
    	VALUES (rplayers_id[array_length(rplayers_id, 1)], TRUE, _id, _round, 'TOURNAMENT')
    	RETURNING id INTO bracket_game_id;

    	brackets_games_id := array_append(brackets_games_id, bracket_game_id);
	END IF;

	UPDATE tournaments
	SET pairing = pairing + 1
	WHERE id = _id;

	RETURN QUERY SELECT TRUE, 'Pairing created successfully', brackets_games_id;

EXCEPTION
	WHEN OTHERS THEN
		RETURN QUERY SELECT FALSE, SQLERRM, '{}'::INTEGER[];
END;
$$ LANGUAGE plpgsql;




CREATE OR REPLACE FUNCTION next_round (
	_name NAME DEFAULT 'tournament'
)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
	_id INT;
	_total_rounds INTEGER;
	_round INTEGER;
	_pairing INTEGER;
	_state tournament_state;
	qualified INTEGER[];
	i INTEGER;
BEGIN
	IF _name IS NULL THEN
		RETURN QUERY SELECT FALSE, 'Pls specify a tournament name not null';
		RETURN ;
	END IF;
	
	SELECT id, round, total_rounds, pairing, tournament_state
	INTO _id, _round, _total_rounds, _pairing, _state
	FROM tournaments
	WHERE name = _name;

	IF NOT FOUND THEN
		RETURN QUERY SELECT FALSE, 'No tournament found to this name';
		RETURN ;
	END IF;

	IF _round >= _total_rounds AND _state != 'WAITING' THEN
		RETURN QUERY SELECT FALSE, 'Tournament is over !';
		RETURN ;
	END IF;

	SELECT ARRAY_AGG(player_id)
	INTO qualified
	FROM tournaments_players
	WHERE tournament_id = _tournament_id
		AND round = _round
		AND current_round_over = TRUE
		AND stil_in = TRUE;


EXCEPTION
	WHEN OTHERS THEN
		RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;

