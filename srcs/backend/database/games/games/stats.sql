CREATE OR REPLACE FUNCTION score(
	_id INTEGER,
	_p1 BOOLEAN DEFAULT TRUE
)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM games WHERE id = _id) THEN
		RETURN QUERY SELECT FALSE, 'No game found to score';
		
	END IF;

	IF _p1 THEN
		UPDATE games SET p1_score = p1_score + 1
		WHERE id = _id;
	ELSE
		UPDATE games SET p2_score = p2_score + 1
		WHERE id = _id;
	END IF;
	RETURN QUERY SELECT TRUE, 'Game scored successfully';
	
EXCEPTION
	WHEN OTHERS THEN
		RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;
