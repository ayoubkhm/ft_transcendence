CREATE OR REPLACE FUNCTION pair_tournament (
	_id INTEGER,
	players_id INTEGER[],
	_nbr_players INTEGER
)
RETURNS jsonb AS $$
DECLARE
	rplayers_id INTEGER[];
	i INTEGER;
	_p1_id INTEGER;
	_p2_id INTEGER;
	_p1_winnerof INTEGER;
	_p2_winnerof INTEGER;
	brackets_json JSONB := '[]'::jsonb;
	game_created RECORD;
	roundi_games JSONB;
	prev_round_games JSONB;
	_round_index INTEGER;
	nbr_players_roundi INTEGER;
	nbr_matchs_round0 INTEGER;
BEGIN
	DELETE FROM games
	WHERE tournament_id = _id;

	SELECT ARRAY_AGG(player_id ORDER BY random())
	INTO rplayers_id
	FROM unnest(players_id) AS player_id;

	nbr_players_roundi := 2 ^ (FLOOR(LOG(2, _nbr_players)));
	nbr_matchs_round0 := _nbr_players - nbr_players_roundi;
	i := 1;
	roundi_games := '[]'::jsonb;
	WHILE (i <= nbr_matchs_round0) LOOP

    	_p1_id := rplayers_id[_nbr_players - (2 * i) + 1];
    	_p2_id := rplayers_id[_nbr_players - (2 * i) + 2];
		
		INSERT INTO games (tournament_id, tournament_round, p1_id, p2_id, type)
		VALUES (_id, 0, _p1_id, _p2_id, 'TOURNAMENT')
		RETURNING * INTO game_created;
		roundi_games := roundi_games || to_jsonb(game_created);
		i := i + 1;
	END LOOP;
	brackets_json := brackets_json || jsonb_build_object('round', 0, 'matchs', roundi_games);


	i := 1;
	prev_round_games := roundi_games;
	roundi_games := '[]'::jsonb;
	WHILE (i <= nbr_players_roundi) LOOP
    	IF (i <= nbr_players_roundi - nbr_matchs_round0) THEN
			_p1_id := rplayers_id[i];
			_p1_winnerof := NULL;
		ELSE
			_p1_id := NULL;
			_p1_winnerof := ((prev_round_games -> (i - 1 - 2 * nbr_players_roundi + _nbr_players)) ->> 'id')::INTEGER;
		END IF;
		IF (i + 1 <= nbr_players_roundi - nbr_matchs_round0) THEN
			_p2_id := rplayers_id[i + 1];
			_p2_winnerof := NULL;
		ELSE
			_p2_id := NULL;
			_p2_winnerof := ((prev_round_games -> (i - 2 * nbr_players_roundi + _nbr_players)) ->> 'id')::INTEGER;
		END IF;
    	
		INSERT INTO games (tournament_id, tournament_round, p1_id, p2_id, type, p1_winnerof, p2_winnerof)
		VALUES (_id, 1, _p1_id, _p2_id, 'TOURNAMENT', _p1_winnerof, _p2_winnerof)
		RETURNING * INTO game_created;
		
		roundi_games := roundi_games || to_jsonb(game_created);

		i := i + 2;
	END LOOP;
	brackets_json := brackets_json || jsonb_build_object('round', 1, 'matchs', roundi_games);

	_round_index := 2;
	nbr_players_roundi := nbr_players_roundi / 2;
	WHILE (nbr_players_roundi > 1) LOOP
		prev_round_games := roundi_games;
		roundi_games := '[]'::jsonb;
		i := 1;
		WHILE (i < nbr_players_roundi) LOOP
			_p1_winnerof := ((prev_round_games -> (i - 1)) ->> 'id')::INTEGER;
			_p2_winnerof := ((prev_round_games -> i) ->> 'id')::INTEGER;
			INSERT INTO games (tournament_id, tournament_round, type, p1_winnerof, p2_winnerof)
			VALUES (_id, _round_index, 'TOURNAMENT', _p1_winnerof, _p2_winnerof)
			RETURNING * INTO game_created;
			
			roundi_games := roundi_games || to_jsonb(game_created);
			i := i + 2;
		END LOOP;

		brackets_json := brackets_json || jsonb_build_object('round', _round_index, 'matchs', roundi_games);
		nbr_players_roundi := nbr_players_roundi / 2;
		_round_index := _round_index + 1;
	END LOOP;

	RETURN brackets_json;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION get_brackets(_id INTEGER)
RETURNS TABLE(success BOOLEAN, msg TEXT, tname TEXT, tstate tournament_state, twinner_id INTEGER, twinner_name TEXT, twinner_tag INTEGER, brackets jsonb) AS $$
DECLARE
	_name TEXT;
	_state tournament_state;
	_winner_id INTEGER;
	_winner_name TEXT := NULL;
	_winner_tag INTEGER := NULL;
BEGIN
	IF _id IS NULL THEN
		RETURN QUERY SELECT FALSE, 'No tournament id provided (null): no brackets', NULL::TEXT as tname, NULL::tournament_state as tstate, NULL::INTEGER as twinner_id, NULL::TEXT as twinner_name, NULL::INTEGER as twinner_tag, '[]'::jsonb;
		RETURN ;
	END IF;

	SELECT name, state, winner_id INTO _name, _state, _winner_id
	FROM tournaments
	WHERE _id = id;

	IF NOT FOUND THEN
		RETURN QUERY SELECT FALSE, 'Tournament not found', NULL::TEXT as tname, NULL::tournament_state as tstate, NULL::INTEGER as twinner_id, NULL::TEXT as twinner_name, NULL::INTEGER as twinner_tag, '[]'::jsonb;
		RETURN ;
	END IF;

	IF _winner_id IS NOT NULL THEN
		SELECT name, tag INTO _winner_name, _winner_tag
		FROM users
		WHERE id = _winner_id;
	END IF;

	RETURN QUERY SELECT TRUE, 'Brackets successfully retrieved', _name as tname, _state as tstate, _winner_id as twinner_id, _winner_name as twinner_name, _winner_tag as twinner_tag, (
		SELECT jsonb_agg(
			jsonb_build_object(
			'round', sub.tournament_round,
			'matchs', sub.matchs
			)
		)
		FROM (
		SELECT
			games_table.tournament_round,
			jsonb_agg(
			jsonb_build_object(
				'id', games_table.id,
				'p1_id', games_table.p1_id,
				'p1_name', u1.name,
				'p1_tag', u1.tag,
				'p1_winnerof', games_table.p1_winnerof,
				'p2_id', games_table.p2_id,
				'p2_name', u2.name,
				'p2_tag', u2.tag,
				'p2_winnerof', games_table.p2_winnerof,
				'state', games_table.state,
				'winner', games_table.winner
				) ORDER BY games_table.id
			) AS matchs
			FROM games games_table
			LEFT JOIN users u1 ON games_table.p1_id IS NOT NULL AND u1.id = games_table.p1_id
			LEFT JOIN users u2 ON games_table.p2_id IS NOT NULL AND u2.id = games_table.p2_id
			WHERE games_table.tournament_id = _id
			GROUP BY games_table.tournament_round
			ORDER BY games_table.tournament_round
		) AS sub
	);

EXCEPTION
	WHEN OTHERS THEN
		RETURN QUERY SELECT FALSE, SQLERRM, NULL::TEXT as tname, NULL::tournament_state as tstate, NULL::INTEGER as twinner_id, NULL::TEXT as twinner_name, NULL::INTEGER as twinner_tag, '[]'::jsonb;
END;
$$ LANGUAGE plpgsql;
