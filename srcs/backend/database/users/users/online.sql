CREATE OR REPLACE FUNCTION set_online(_id INTEGER)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
	user_found BOOLEAN := FALSE;
BEGIN
	IF _id IS NULL THEN
		RETURN QUERY SELECT FALSE, 'User not found (id is null)';
		RETURN ;
	END IF;
	UPDATE users
	SET online = TRUE
	WHERE id = _id
	RETURNING TRUE INTO user_found;

	IF user_found THEN
		RETURN QUERY SELECT TRUE, 'User put online';
		RETURN ;
	END IF;
	RETURN QUERY SELECT FALSE, 'No user found with that id % (set_online fail)';
	
EXCEPTION
	WHEN OTHERS THEN
    	RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;



CREATE OR REPLACE FUNCTION set_online(_email TEXT)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
	user_found BOOLEAN := FALSE;
BEGIN
	IF _id IS NULL THEN
		RETURN QUERY SELECT FALSE, 'User not found (id is null)';
		RETURN ;
	END IF;
	UPDATE users
	SET online = TRUE
	WHERE email = _email
	RETURNING TRUE INTO user_found;

	IF user_found THEN
		RETURN QUERY SELECT TRUE, 'User put online';
		RETURN ;
	END IF;
	RETURN QUERY SELECT FALSE, 'No user found with that id % (set_online fail)';
	
EXCEPTION
	WHEN OTHERS THEN
    	RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;



CREATE OR REPLACE FUNCTION set_offline(_id INTEGER)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
	user_found BOOLEAN := FALSE;
BEGIN
	IF _id IS NULL THEN
		RETURN QUERY SELECT FALSE, 'User not found (id is null)';
		RETURN ;
	END IF;
	UPDATE users
	SET online = FALSE
	WHERE id = _id
	RETURNING TRUE INTO user_found;

	IF user_found THEN
		RETURN QUERY SELECT TRUE, 'User put online';
		RETURN ;
	END IF;
	RETURN QUERY SELECT FALSE, 'No user found with that id % (set_offline fail)';
	
EXCEPTION
	WHEN OTHERS THEN
    	RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;



CREATE OR REPLACE FUNCTION set_offline(_email TEXT)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
	user_found BOOLEAN := FALSE;
BEGIN
	IF _id IS NULL THEN
		RETURN QUERY SELECT FALSE, 'User not found (id is null)';
		RETURN ;
	END IF;
	UPDATE users
	SET online = FALSE
	WHERE email = _email
	RETURNING TRUE INTO user_found;

	IF user_found THEN
		RETURN QUERY SELECT TRUE, 'User put online';
		RETURN ;
	END IF;
	RETURN QUERY SELECT FALSE, 'No user found with that id % (set_offline fail)';
	
EXCEPTION
	WHEN OTHERS THEN
    	RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;

