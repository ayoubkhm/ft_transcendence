CREATE OR REPLACE FUNCTION new_2fa_user(
	_name TEXT,
	twofa_tmp_secret TEXT,
	_email TEXT DEFAULT NULL,
	_password TEXT DEFAULT NULL,
	_online BOOLEAN DEFAULT TRUE
)
RETURNS TABLE(success BOOLEAN, msg TEXT, new_user_id INTEGER) AS $$
DECLARE
	_new_user_id INTEGER;
	_type TEXT;
BEGIN
	IF twofa_tmp_secret IS NULL THEN
		RETURN QUERY SELECT FALSE, '2fa secret can''t be null', NULL::INTEGER;
		RETURN ;
	END IF;
	_type := 'signed';
	IF _password IS NULL THEN
		_type := 'oauth';
	END IF;

	INSERT INTO users (name, type, email, password, online, active, twofa_secret, twofa_validated)
	VALUES (_name, _type, _email, _password, _online, FALSE, twofa_tmp_secret, FALSE)
	RETURNING id INTO _new_user_id;

	RETURN QUERY SELECT TRUE, '2fa User created successfully', _new_user_id;

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



CREATE OR REPLACE FUNCTION validate_2fa(
	_id INTEGER,
	new_2fa_secret TEXT
)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$

BEGIN
	IF new_2fa_secret IS NULL THEN
		RETURN QUERY SELECT FALSE, '2fa secret can''t be null', NULL::INTEGER;
	END IF;
	UPDATE users
	SET twofa_secret = new_2fa_secret,
		twofa_validated = TRUE,
		active = TRUE
	WHERE id = _id;

	RETURN QUERY SELECT TRUE, '2fa User successfully validated';

EXCEPTION
	WHEN OTHERS THEN
		RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;



CREATE OR REPLACE FUNCTION change_to_2fa(
	_id INTEGER,
	twofa_tmp_secret TEXT
)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
	is_2fa TEXT;
BEGIN
	IF new_2fa_secret IS NULL THEN
		RETURN QUERY SELECT FALSE, '2fa secret can''t be null', NULL::INTEGER;
	END IF;
	SELECT twofa_secret INTO is_2fa
	FROM users
	WHERE id = _id;
	IF is_2fa IS NOT NULL THEN
		RETURN QUERY SELECT FALSE, 'User is already 2fa';
		RETURN ;
	END IF;

	UPDATE users
	SET twofa_secret = twofa_tmp_secret,
		twofa_validated = FALSE
	WHERE id = _id;

	RETURN QUERY SELECT TRUE, 'User successfully changed to 2fa';

EXCEPTION
	WHEN OTHERS THEN
		RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;




CREATE OR REPLACE FUNCTION rm_2fa(
	_id INTEGER
)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
	is_2fa TEXT;
BEGIN
	SELECT twofa_secret INTO is_2fa
	FROM users
	WHERE id = _id;
	IF is_2fa IS NULL THEN
		RETURN QUERY SELECT FALSE, 'User isn''t 2fa';
		RETURN ;
	END IF;

	UPDATE users
	SET twofa_secret = NULL,
		twofa_validated = NULL
	WHERE id = _id;

	RETURN QUERY SELECT TRUE, 'User successfully removed 2fa';

EXCEPTION
	WHEN OTHERS THEN
		RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;

