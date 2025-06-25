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



CREATE OR REPLACE FUNCTION update_user_email(_id INT, _email TEXT)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
BEGIN
	UPDATE users
	SET email = _email
	WHERE id = _id;

	RETURN QUERY SELECT TRUE, 'Email updated successfully';

EXCEPTION
	WHEN unique_violation THEN
    	RETURN QUERY SELECT FALSE, 'Email is already in use';
	WHEN OTHERS THEN
    	RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;




CREATE OR REPLACE FUNCTION update_user_name(_id INT, _name TEXT)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
BEGIN
	UPDATE users
	SET name = _name
	WHERE id = _id;

	RETURN QUERY SELECT TRUE, 'Username updated successfully';

EXCEPTION
	WHEN unique_violation THEN
    	RETURN QUERY SELECT FALSE, 'Username is already taken';
	WHEN OTHERS THEN
    	RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;




CREATE OR REPLACE FUNCTION update_user_password(_id INT, _password TEXT)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
-- DECLARE
--   hashed TEXT;
BEGIN
-- TODO conditions password
--   IF _password IS NULL OR LENGTH(_password) < 6 THEN
--     RETURN QUERY SELECT FALSE, 'Password must be at least 6 characters';
--   END IF;

--   hashed := crypt(_password, gen_salt('bf'));

	UPDATE users
	SET password = _password
	WHERE id = _id;

	RETURN QUERY SELECT TRUE, 'Password updated successfully';

EXCEPTION
	WHEN OTHERS THEN
    	RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;




CREATE OR REPLACE FUNCTION delete_user(_id INT)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM users WHERE id = _id) THEN
    	RETURN QUERY SELECT FALSE, 'User not found';
	END IF;

	DELETE FROM users WHERE id = _id;

	RETURN QUERY SELECT TRUE, 'User deleted successfully';

EXCEPTION
	WHEN OTHERS THEN
    	RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION get_user(_id INT)
RETURNS TABLE(succes BOOLEAN, msg TEXT, name TEXT, email TEXT, type TEXT, admin BOOLEAN) AS $$
DECLARE
	u users%ROWTYPE;
BEGIN
	SELECT * INTO u FROM users WHERE id = _id;
	IF NOT FOUND THEN
    	RETURN QUERY SELECT FALSE, 'User not found';
	END IF;

  RETURN QUERY SELECT TRUE, 'User info collected', u.id, u.name, u.email, u.type, u.admin;
EXCEPTION
	WHEN OTHERS then
		return QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;