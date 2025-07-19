CREATE OR REPLACE FUNCTION toggle_player_ready(
    _player_id INTEGER,
    _tournament_id INTEGER
)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
BEGIN
    UPDATE tournaments_players
    SET is_ready = NOT is_ready
    WHERE player_id = _player_id AND tournament_id = _tournament_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Player or tournament not found.';
        RETURN;
    END IF;

    RETURN QUERY SELECT TRUE, 'Player ready status toggled.';
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;
