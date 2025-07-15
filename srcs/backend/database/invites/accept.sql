CREATE OR REPLACE FUNCTION accept_invite(
    _from_user_id INTEGER,
    _to_user_id INTEGER,
    _type invite_type DEFAULT 'friend')
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
    invite_deleted BOOLEAN;
BEGIN
    DELETE FROM invites
        WHERE (from_id = _from_user_id
                AND to_id = _to_user_id)
    RETURNING TRUE INTO invite_deleted;

    IF NOT invite_deleted THEN
        RETURN QUERY SELECT FALSE, 'Invite not found';
        RETURN ;
    END IF;

    DELETE FROM invites
        WHERE (from_id = _to_user_id
                AND to_id = _from_user_id);

    IF _type = 'friend' THEN
        RAISE NOTICE 'HERE mothefucker';
        RETURN QUERY SELECT * FROM new_friends(_from_user_id, _to_user_id);
    ELSE
        RETURN QUERY SELECT FALSE, 'Invite type not handled';
    END IF;
EXCEPTION
	WHEN OTHERS THEN
    	RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION accept_invite(
    _from_user_email TEXT,
    _to_user_id INTEGER,
    _type invite_type DEFAULT 'friend')
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
    _from_user_id INTEGER;
BEGIN
    SELECT id INTO _from_user_id
    FROM users
    WHERE email = _from_user_email;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'User from not exists';
        RETURN ;
    END IF;

    RETURN QUERY SELECT * FROM accept_invite(_from_user_id, _to_user_id, _type);
EXCEPTION
	WHEN OTHERS THEN
    	RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION accept_invite(
    _from_user_id INTEGER,
    _to_user_email TEXT,
    _type invite_type DEFAULT 'friend')
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
    _to_user_id INTEGER;
BEGIN
    SELECT id INTO _to_user_id
    FROM users
    WHERE email = _to_user_email;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'User to not exists';
        RETURN ;
    END IF;

    RETURN QUERY SELECT * FROM accept_invite(_from_user_id, _to_user_id, _type);
EXCEPTION
	WHEN OTHERS THEN
    	RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION accept_invite(
    _from_user_email TEXT,
    _to_user_email TEXT,
    _type invite_type DEFAULT 'friend')
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
    _from_user_id INTEGER;
    _to_user_id INTEGER;
BEGIN
    SELECT id INTO _from_user_id
    FROM users
    WHERE email = _from_user_email;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'User from not exists';
        RETURN ;
    END IF;

    SELECT id INTO _to_user_id
    FROM users
    WHERE email = _to_user_email;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'User to not exists';
        RETURN ;
    END IF;

    RETURN QUERY SELECT * FROM accept_invite(_from_user_id, _to_user_id, _type);
EXCEPTION
	WHEN OTHERS THEN
    	RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;