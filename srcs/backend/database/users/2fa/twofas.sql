CREATE TABLE IF NOT EXISTS twofas (
	id SERIAL PRIMARY KEY,
	user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	UNIQUE(user_id),
	secret TEXT NOT NULL,
	given TEXT DEFAULT NULL
);


CREATE OR REPLACE FUNCTION new_2fa(
	_user_id INTEGER,
	_secret TEXT
)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
BEGIN
	IF _user_id IS NULL THEN
		RETURN QUERY SELECT FALSE, 'User id can''t be null';
		RETURN ;
	END IF;
	
	IF _secret IS NULL THEN
		RETURN QUERY SELECT FALSE, '2fa secret can''t be null';
		RETURN ;
	END IF;

	INSERT INTO twofas (user_id, secret)
	VALUES (_user_id, _secret);

	RETURN QUERY SELECT TRUE, '2fa secret created successfully';

EXCEPTION
	WHEN OTHERS THEN
		RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;



CREATE OR REPLACE FUNCTION validate_2fa(
	_user_id INTEGER,
	_input TEXT
)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
	_secret TEXT;
	secret_deleted BOOLEAN;
BEGIN
	IF _user_id IS NULL THEN
		RETURN QUERY SELECT FALSE, 'User id can''t be null';
		RETURN ;
	END IF;
	IF _input IS NULL THEN
		RETURN QUERY SELECT FALSE, '2fa secret input can''t be null';
		RETURN ;
	END IF;

	SELECT secret INTO _secret
	FROM twofas
	WHERE user_id = _user_id;
	
	IF NOT FOUND THEN
		RETURN QUERY SELECT FALSE, 'User id not found';
		RETURN ;
	END IF;

	IF _secret = _input THEN
		RETURN QUERY SELECT TRUE, '2fa secret matched';
		
		DELETE FROM twofas WHERE user_id = _user_id RETURNING TRUE INTO secret_deleted;
		IF secret_deleted THEN
			RETURN QUERY SELECT TRUE, 'Secret deleted successfully';
		ELSE
			RETURN QUERY SELECT FALSE, 'Secret couldnt be deleted';
		END IF;
		RETURN ;
	END IF;

	RETURN QUERY SELECT FALSE, '2fa secret didnt match';

EXCEPTION
	WHEN OTHERS THEN
		RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;



CREATE OR REPLACE FUNCTION delete_2fa(
	_user_id INTEGER
)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
	secret_deleted BOOLEAN;
BEGIN
	IF _user_id IS NULL THEN
		RETURN QUERY SELECT FALSE, 'User id can''t be null';
		RETURN ;
	END IF;

	DELETE FROM twofas WHERE user_id = _user_id RETURNING TRUE INTO secret_deleted;
	IF secret_deleted THEN
		RETURN QUERY SELECT TRUE, 'Secret deleted successfully';
	ELSE
		RETURN QUERY SELECT FALSE, 'Secret couldnt be deleted';
	END IF;
	

EXCEPTION
	WHEN OTHERS THEN
		RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;
