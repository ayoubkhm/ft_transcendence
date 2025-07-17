CREATE OR REPLACE FUNCTION new_game(
    _p1_id INTEGER DEFAULT NULL,
    _p2_id INTEGER DEFAULT NULL,
    _state game_state DEFAULT 'RUNNING'
)
RETURNS TABLE(success BOOLEAN, msg TEXT, new_game_id INTEGER) AS $$
DECLARE
    _p1_bot BOOLEAN NOT NULL := FALSE;
    _p2_bot BOOLEAN NOT NULL := FALSE;
    _type game_type NOT NULL := 'VS';
    _new_game_id INTEGER;
BEGIN
    IF _p1_id IS NULL THEN
        _p1_bot := TRUE;
        _type = 'IA';
    END IF;
    IF _p2_id IS NULL THEN
        _p2_bot := TRUE;
        _type = 'IA';
    END IF;
    INSERT INTO games (p1_id, p2_id, state, p1_bot, p2_bot, type)
    VALUES (_p1_id, _p2_id, _state, _p1_bot, _p2_bot, _type)
    RETURNING id INTO _new_game_id;

    RETURN QUERY SELECT TRUE, 'Game created successfully', _new_game_id;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT FALSE, SQLERRM, NULL::INTEGER;
END;
$$ LANGUAGE plpgsql;