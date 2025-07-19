CREATE OR REPLACE FUNCTION advance_winners(_tournament_id INTEGER)
RETURNS void AS $$
DECLARE
    game_record RECORD;
    winner_id INTEGER;
BEGIN
    RAISE NOTICE '[advance_winners] Checking for games to advance in tournament %', _tournament_id;

    -- Find all WAITING games in the tournament that are waiting for a winner
    FOR game_record IN
        SELECT id, p1_winnerof, p2_winnerof
        FROM games
        WHERE tournament_id = _tournament_id AND state = 'WAITING'
          AND (p1_winnerof IS NOT NULL OR p2_winnerof IS NOT NULL)
    LOOP
        RAISE NOTICE '[advance_winners] Found waiting game %', game_record.id;

        -- Advance player 1 if they are from a previous match
        IF game_record.p1_winnerof IS NOT NULL THEN
            SELECT CASE WHEN winner = TRUE THEN p1_id ELSE p2_id END
            INTO winner_id
            FROM games
            WHERE id = game_record.p1_winnerof;

            IF winner_id IS NOT NULL THEN
                RAISE NOTICE '[advance_winners] Advancing winner of match % (player %) to p1 slot of game %', game_record.p1_winnerof, winner_id, game_record.id;
                UPDATE games SET p1_id = winner_id WHERE id = game_record.id;
            END IF;
        END IF;

        -- Advance player 2 if they are from a previous match
        IF game_record.p2_winnerof IS NOT NULL THEN
            SELECT CASE WHEN winner = TRUE THEN p1_id ELSE p2_id END
            INTO winner_id
            FROM games
            WHERE id = game_record.p2_winnerof;

            IF winner_id IS NOT NULL THEN
                RAISE NOTICE '[advance_winners] Advancing winner of match % (player %) to p2 slot of game %', game_record.p2_winnerof, winner_id, game_record.id;
                UPDATE games SET p2_id = winner_id WHERE id = game_record.id;
            END IF;
        END IF;
    END LOOP;
    RAISE NOTICE '[advance_winners] Finished advancing winners for tournament %', _tournament_id;
END;
$$ LANGUAGE plpgsql;
