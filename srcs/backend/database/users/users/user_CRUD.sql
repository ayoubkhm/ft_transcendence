CREATE OR REPLACE FUNCTION new_user(
	_name TEXT,
	_type TEXT DEFAULT 'guest',
	_email TEXT DEFAULT NULL,
	_password TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
BEGIN
	INSERT INTO users (name, type, email, password)
	VALUES (_name, _type, _email, _password);

	RETURN QUERY SELECT TRUE, 'User created successfully';

EXCEPTION
	WHEN unique_violation THEN
		-- IF SQLERRM LIKE '%users_name_key%' THEN
		-- 	RETURN QUERY SELECT FALSE, 'Username is already taken';
		IF SQLERRM LIKE '%users_email_key%' THEN
			RETURN QUERY SELECT FALSE, 'Email is already in use';
		ELSE
			RETURN QUERY SELECT FALSE, 'Unique constraint violation on users (not normal)';
		END IF;
	WHEN OTHERS THEN
		RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- IF HASHAGE DU PASS DANS LA DB : TODO
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- -> hashed_password := crypt(_password, gen_salt('bf'));



CREATE OR REPLACE FUNCTION update_user_email(_email TEXT, _newEmail TEXT)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
	user_found BOOLEAN := FALSE;
BEGIN
	IF _email IS NULL THEN
		RETURN QUERY SELECT FALSE, 'User not found (email is null)';
	ELSIF _newEmail IS NULL THEN
		RETURN QUERY SELECT FALSE, 'New email can''t be null';
	END IF;
	UPDATE users
	SET email = _newEmail
	WHERE email = _email
	RETURNING TRUE INTO user_found;

	IF user_found THEN
		RETURN QUERY SELECT TRUE, 'Email updated successfully';
	END IF;
	RETURN QUERY SELECT FALSE, 'No user found with that email (update email fail)';
	

EXCEPTION
	WHEN unique_violation THEN
    	RETURN QUERY SELECT FALSE, 'Email is already in use';
	WHEN OTHERS THEN
    	RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;




CREATE OR REPLACE FUNCTION update_user_name(_email TEXT, _name TEXT)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
	user_found BOOLEAN := FALSE;
BEGIN
	IF _email IS NULL THEN
		RETURN QUERY SELECT FALSE, 'User not found (email is null)';
	ELSIF _name IS NULL THEN
		RETURN QUERY SELECT FALSE, 'New name can''t be null';
	END IF;
	UPDATE users
	SET name = _name
	WHERE email = _email
	RETURNING TRUE INTO user_found;

	IF user_found THEN
		RETURN QUERY SELECT TRUE, 'Username updated successfully';
	END IF;
	RETURN QUERY SELECT FALSE, 'No user not found with that email (update name fail)';
	
EXCEPTION
	-- WHEN unique_violation THEN
    -- 	RETURN QUERY SELECT FALSE, 'Username is already taken';
	WHEN OTHERS THEN
    	RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;




CREATE OR REPLACE FUNCTION update_user_password(_email TEXT, _password TEXT)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
	user_found BOOLEAN := FALSE;
BEGIN
	IF _email IS NULL THEN
		RETURN QUERY SELECT FALSE, 'User not found (email is null)';
	ELSIF _password IS NULL THEN
		RETURN QUERY SELECT FALSE, 'New password can''t be null';
	END IF;
	UPDATE users
	SET password = _password
	WHERE email = _email
	RETURNING TRUE INTO user_found;

	IF user_found THEN
		RETURN QUERY SELECT TRUE, 'Password updated successfully';
	END IF;
	RETURN QUERY SELECT FALSE, 'No user found with that email (update password fail)';
	
EXCEPTION
	WHEN OTHERS THEN
    	RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;




CREATE OR REPLACE FUNCTION delete_user(_email TEXT)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
	user_deleted BOOLEAN := FALSE;
BEGIN
	DELETE FROM users WHERE email = _email RETURNING TRUE INTO user_deleted;
	IF user_deleted THEN
		RETURN QUERY SELECT TRUE, 'User deleted successfully';
	ELSE
		RETURN QUERY SELECT FALSE, 'No user found with that email (delete fail)';
	END IF;
EXCEPTION
	WHEN OTHERS THEN
    	RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;

