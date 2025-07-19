CREATE OR REPLACE FUNCTION new_user(
	_name TEXT,
	_type TEXT DEFAULT 'guest',
	_email TEXT DEFAULT NULL,
	_password TEXT DEFAULT NULL,
	_avatar TEXT DEFAULT '/default_avatar.jpg',
	is_2fa BOOLEAN DEFAULT FALSE,
	_online BOOLEAN DEFAULT TRUE
)
RETURNS TABLE(success BOOLEAN, msg TEXT, new_user_id INTEGER) AS $$
DECLARE
	_new_user_id INTEGER;
BEGIN
	IF is_2fa THEN
		INSERT INTO users (name, type, email, password, avatar, online, twofa_secret, twofa_validated, active)
		VALUES (_name, _type, _email, _password, COALESCE(_avatar, '/default_avatar.jpg'), _online, NULL, FALSE, FALSE)
		RETURNING id INTO _new_user_id;
	ELSE
		INSERT INTO users (name, type, email, password, online, avatar)
		VALUES (_name, _type, _email, _password, _online, COALESCE(_avatar, '/default_avatar.jpg'))
		RETURNING id INTO _new_user_id;
	END IF;
	
	RETURN QUERY SELECT TRUE, 'User created successfully', _new_user_id;

EXCEPTION
	WHEN unique_violation THEN
		IF SQLERRM LIKE '%users_email_key%' THEN
			RETURN QUERY SELECT FALSE, 'Email is already in use', NULL::INTEGER;
		ELSE
			RETURN QUERY SELECT FALSE, 'Unique constraint violation on users (not normal)', NULL::INTEGER;
		END IF;
	WHEN OTHERS THEN
		RETURN QUERY SELECT FALSE, SQLERRM, NULL::INTEGER;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION update_user_email(_email TEXT, _newEmail TEXT)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
	user_found BOOLEAN := FALSE;
BEGIN
	IF _email IS NULL THEN
		RETURN QUERY SELECT FALSE, 'User not found (email is null)';
		RETURN ;
	ELSIF _newEmail IS NULL THEN
		RETURN QUERY SELECT FALSE, 'New email can''t be null';
		RETURN ;
	END IF;
	UPDATE users
	SET email = _newEmail
	WHERE email = _email
	RETURNING TRUE INTO user_found;

	IF user_found THEN
		RETURN QUERY SELECT TRUE, 'Email updated successfully';
		RETURN ;
	END IF;
	RETURN QUERY SELECT FALSE, 'No user found with that email (update email fail)';
	
EXCEPTION
	WHEN unique_violation THEN
    	RETURN QUERY SELECT FALSE, 'Email is already in use';
	WHEN OTHERS THEN
    	RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_user_email(_id INTEGER, _newEmail TEXT)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
	user_found BOOLEAN := FALSE;
BEGIN
	IF _id IS NULL THEN
		RETURN QUERY SELECT FALSE, 'User not found (_id is null)';
		RETURN ;
	ELSIF _newEmail IS NULL THEN
		RETURN QUERY SELECT FALSE, 'New email can''t be null';
		RETURN ;
	END IF;

	UPDATE users
	SET email = _newEmail
	WHERE id = _id
	RETURNING TRUE INTO user_found;

	IF user_found THEN
		RETURN QUERY SELECT TRUE, 'Email updated successfully';
		RETURN ;
	END IF;
	RETURN QUERY SELECT FALSE, 'No user found with that id (update email fail)';
	
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
		RETURN ;
	ELSIF _name IS NULL THEN
		RETURN QUERY SELECT FALSE, 'New name can''t be null';
		RETURN ;
	END IF;
	UPDATE users
	SET name = _name
	WHERE email = _email
	RETURNING TRUE INTO user_found;

	IF user_found THEN
		RETURN QUERY SELECT TRUE, 'Username updated successfully';
		RETURN ;
	END IF;
	RETURN QUERY SELECT FALSE, 'No user not found with that email (update name fail)';
	
EXCEPTION
	-- WHEN unique_violation THEN
    -- 	RETURN QUERY SELECT FALSE, 'Username is already taken';
	WHEN OTHERS THEN
    	RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_user_name(_id INTEGER, _name TEXT)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
	user_found BOOLEAN := FALSE;
BEGIN
	IF _id IS NULL THEN
		RETURN QUERY SELECT FALSE, 'User not found (id is null)';
		RETURN ;
	ELSIF _name IS NULL THEN
		RETURN QUERY SELECT FALSE, 'New name can''t be null';
		RETURN ;
	END IF;
	UPDATE users
	SET name = _name
	WHERE id = _id
	RETURNING TRUE INTO user_found;

	IF user_found THEN
		RETURN QUERY SELECT TRUE, 'Username updated successfully';
		RETURN ;
	END IF;
	RETURN QUERY SELECT FALSE, 'No user not found with that id (update name fail)';
	
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
		RETURN ;
	ELSIF _password IS NULL THEN
		RETURN QUERY SELECT FALSE, 'New password can''t be null';
		RETURN ;
	END IF;
	UPDATE users
	SET password = _password
	WHERE email = _email
	RETURNING TRUE INTO user_found;

	IF user_found THEN
		RETURN QUERY SELECT TRUE, 'Password updated successfully';
		RETURN ;
	END IF;
	RETURN QUERY SELECT FALSE, 'No user found with that email (update password fail)';
	
EXCEPTION
	WHEN OTHERS THEN
    	RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_user_password(_id INTEGER, _password TEXT)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
	user_found BOOLEAN := FALSE;
BEGIN
	IF _id IS NULL THEN
		RETURN QUERY SELECT FALSE, 'User not found (id is null)';
		RETURN ;
	ELSIF _password IS NULL THEN
		RETURN QUERY SELECT FALSE, 'New password can''t be null';
		RETURN ;
	END IF;
	UPDATE users
	SET password = _password
	WHERE id = _id
	RETURNING TRUE INTO user_found;

	IF user_found THEN
		RETURN QUERY SELECT TRUE, 'Password updated successfully';
		RETURN ;
	END IF;
	RETURN QUERY SELECT FALSE, 'No user found with that id (update password fail)';
	
EXCEPTION
	WHEN OTHERS THEN
    	RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION update_user_avatar(_email TEXT, _avatar TEXT)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
	user_found BOOLEAN := FALSE;
BEGIN
	IF _email IS NULL THEN
		RETURN QUERY SELECT FALSE, 'User not found (email is null)';
		RETURN ;
	ELSIF _avatar IS NULL THEN
		RETURN QUERY SELECT FALSE, 'New password can''t be null';
		RETURN ;
	END IF;
	UPDATE users
	SET avatar = _avatar
	WHERE email = _email
	RETURNING TRUE INTO user_found;

	IF user_found THEN
		RETURN QUERY SELECT TRUE, 'Password updated successfully';
		RETURN ;
	END IF;
	RETURN QUERY SELECT FALSE, 'No user found with that email % (update avatar fail)', _email;
	
EXCEPTION
	WHEN OTHERS THEN
    	RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_user_avatar(_id INTEGER, _avatar TEXT)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
	user_found BOOLEAN := FALSE;
BEGIN
	IF _id IS NULL THEN
		RETURN QUERY SELECT FALSE, 'User not found (id is null)';
		RETURN ;
	ELSIF _avatar IS NULL THEN
		RETURN QUERY SELECT FALSE, 'New password can''t be null';
		RETURN ;
	END IF;
	UPDATE users
	SET avatar = _avatar
	WHERE id = _id
	RETURNING TRUE INTO user_found;

	IF user_found THEN
		RETURN QUERY SELECT TRUE, 'Password updated successfully';
		RETURN ;
	END IF;
	RETURN QUERY SELECT FALSE, 'No user found with that id % (update avatar fail)', _id;
	
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

CREATE OR REPLACE FUNCTION delete_user(_id INTEGER)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
	user_deleted BOOLEAN := FALSE;
BEGIN
	DELETE FROM users WHERE id = _id RETURNING TRUE INTO user_deleted;
	IF user_deleted THEN
		RETURN QUERY SELECT TRUE, 'User deleted successfully';
	ELSE
		RETURN QUERY SELECT FALSE, 'No user found with that id (delete fail)';
	END IF;
EXCEPTION
	WHEN OTHERS THEN
    	RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION get_public(_id INTEGER)
RETURNS TABLE(success BOOLEAN, msg TEXT, friend public_user) AS $$
DECLARE
	_name TEXT;
	_tag INTEGER;
	_email TEXT;
	_avatar TEXT;
	_online BOOLEAN;
BEGIN
	SELECT name, tag, email, avatar, online INTO _name, _tag, _email, _avatar, _online
	FROM users
	WHERE id = _id;
	IF NOT FOUND THEN
		RETURN QUERY SELECT FALSE, 'User not found with this id', NULL::public_user;
		RETURN ;
	END IF;
	
	RETURN QUERY SELECT TRUE, 'User public info successfully retrieved', ROW(_id, _name, _tag, _email, _avatar, _online)::public_user;
EXCEPTION
	WHEN OTHERS THEN
    	RETURN QUERY SELECT FALSE, SQLERRM, NULL::public_user;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_public(_email TEXT)
RETURNS TABLE(success BOOLEAN, msg TEXT, friend public_user) AS $$
DECLARE
	_id INTEGER;
	_name TEXT;
	_tag INTEGER;
	_avatar TEXT;
	_online BOOLEAN;
BEGIN
	SELECT id, name, tag, avatar, online INTO _id, _name, _tag, _avatar, _online
	FROM users
	WHERE email = _email;
	IF NOT FOUND THEN
		RETURN QUERY SELECT FALSE, 'User not found with this email', NULL::public_user;
		RETURN ;
	END IF;
	
	RETURN QUERY SELECT TRUE, 'User public info successfully retrieved', ROW(_id, _name, _tag, _email, _avatar, _online)::public_user;
EXCEPTION
	WHEN OTHERS THEN
    	RETURN QUERY SELECT FALSE, SQLERRM, NULL::public_user;
END;
$$ LANGUAGE plpgsql;