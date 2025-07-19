CREATE OR REPLACE FUNCTION end_game(
    _game_id INTEGER,
    _winner_id INTEGER,
    _p1_score INTEGER,
    _p2_score INTEGER
)
RETURNS TABLE(success BOOLEAN, msg TEXT, tournament_id INTEGER) AS $$
DECLARE
    _tournament_id INTEGER;
    _tournament_round INTEGER;
    _total_rounds INTEGER;
    _is_final_round BOOLEAN;
    _round_games_over BOOLEAN;
BEGIN
    -- Update the game that just ended
    UPDATE games
    SET
        winner = (_winner_id = p1_id),
        state = 'OVER',
        p1_score = _p1_score,
        p2_score = _p2_score
    WHERE id = _game_id
    RETURNING games.tournament_id, games.tournament_round INTO _tournament_id, _tournament_round;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Game not found.', NULL::INTEGER;
        RETURN;
    END IF;

    -- Check if this was the final round
    SELECT total_rounds INTO _total_rounds FROM tournaments WHERE id = _tournament_id;
    _is_final_round := _tournament_round = _total_rounds;

    -- If it was the final, mark the tournament as over
    IF _is_final_round THEN
        UPDATE tournaments SET state = 'OVER', winner_id = _winner_id WHERE id = _tournament_id;
        RETURN QUERY SELECT TRUE, 'Final game ended. Tournament over.', _tournament_id;
        RETURN;
    END IF;

    -- Check if all other games in this round are over
    SELECT bool_and(g.state = 'OVER')
    INTO _round_games_over
    FROM games g
    WHERE g.tournament_id = _tournament_id AND g.tournament_round = _tournament_round;

    -- If all games in the round are over, advance the tournament
    IF _round_games_over THEN
        UPDATE tournaments SET round = round + 1 WHERE id = _tournament_id;
        -- This should call the function that creates the next round's games
        PERFORM next_round(_tournament_id);
        RETURN QUERY SELECT TRUE, 'Round finished. Next round created.', _tournament_id;
    ELSE
        RETURN QUERY SELECT TRUE, 'Game ended. Waiting for other games in the round to finish.', _tournament_id;
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT FALSE, SQLERRM, NULL::INTEGER;
END;
$$ LANGUAGE plpgsql;
