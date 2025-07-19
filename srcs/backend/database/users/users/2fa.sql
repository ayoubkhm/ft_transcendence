CREATE OR REPLACE FUNCTION add_2fa_secret(
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
		twofa_validated = FALSE
	WHERE id = _id;

	RETURN QUERY SELECT TRUE, 'Successfully added 2fa secret to user';

EXCEPTION
	WHEN OTHERS THEN
		RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION validate_2fa(
	_id INTEGER,
	new_2fa_secret TEXT
)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
	_validated BOOLEAN;
BEGIN
	IF new_2fa_secret IS NULL THEN
		RETURN QUERY SELECT FALSE, '2fa secret can''t be null';
	END IF;

	SELECT twofa_validated INTO _validated
	FROM users
	WHERE id = _id;
	
	IF NOT FOUND THEN
		RETURN QUERY SELECT FALSE, 'User not found';
		
	END IF;

	IF _validated IS NULL THEN
		RETURN QUERY SELECT FALSE, 'User isnt 2fa';
		
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



CREATE OR REPLACE FUNCTION expire_2fa(
	_id INTEGER
)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
	_validated BOOLEAN;
BEGIN

	SELECT twofa_validated INTO _validated
	FROM users
	WHERE id = _id;
	
	IF NOT FOUND THEN
		RETURN QUERY SELECT FALSE, 'User not found';
		
	END IF;

	IF _validated IS NULL THEN
		RETURN QUERY SELECT FALSE, 'User isnt 2fa';
		
	END IF;

	UPDATE users
	SET twofa_secret = NULL,
		twofa_validated = FALSE
	WHERE id = _id;

	RETURN QUERY SELECT TRUE, '2fa User has 2fa expired';

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

