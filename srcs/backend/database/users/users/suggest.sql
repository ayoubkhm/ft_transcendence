CREATE TYPE user_suggestion AS (
  id INTEGER,
  name TEXT,
  tag INTEGER
);

CREATE OR REPLACE FUNCTION suggest_users(
	input TEXT
)
RETURNS TABLE(success BOOLEAN, msg TEXT, suggestions user_suggestion[]) AS $$
BEGIN

    RETURN QUERY SELECT TRUE, 'Suggestions successful', ARRAY(
        SELECT ROW(users.id, users.name, users.tag)::user_suggestion
        FROM users
        WHERE (input = '' OR name ILIKE input || '%')
        ORDER BY users.name
        LIMIT 10
    );

EXCEPTION
	WHEN OTHERS THEN
		RETURN QUERY SELECT FALSE, SQLERRM, ARRAY[]::user_suggestion[];
END;
$$ LANGUAGE plpgsql;
