CREATE OR REPLACE FUNCTION pair_tournament (
	_id INTEGER,
	players_id INTEGER[]
)
RETURNS INTEGER[] AS $$
DECLARE
	rplayers_id INTEGER[];
	brackets_games_id INTEGER[];
	bracket_game_id INTEGER;
	i INTEGER;
BEGIN
	IF _id IS NULL THEN
		RAISE EXCEPTION 'Pls specify a tournament id not null';
	END IF;

	DELETE FROM games
	WHERE tournament_id = _id;

	SELECT ARRAY_AGG(player_id ORDER BY random())
	INTO rplayers_id
	FROM unnest(players_id) AS player_id;

	i := 1;
	WHILE i < array_length(rplayers_id, 1) LOOP
    	INSERT INTO games (p1_id, p2_id, tournament_id, tournament_round, type)
    	VALUES (rplayers_id[i], rplayers_id[i + 1], _id, 1, 'TOURNAMENT')
    	RETURNING id INTO bracket_game_id;

    	brackets_games_id := array_append(brackets_games_id, bracket_game_id);
    	i := i + 2;
	END LOOP;

	RETURN brackets_games_id;
END;
$$ LANGUAGE plpgsql;

