CREATE OR REPLACE FUNCTION new_friends(
	_id1 INTEGER,
    _id2 INTEGER
)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
    _type BOOLEAN;
BEGIN
    SELECT type INTO _type
    FROM users
    WHERE id = _id1;
    IF (_type = 'guest') THEN
        RETURN QUERY SELECT FALSE, 'Guest can''t have friends (user 1 is guest)';
        RETURN ;
    END IF;

    SELECT type INTO _type
    FROM users
    WHERE id = _id2;
    IF (_type = 'guest') THEN
        RETURN QUERY SELECT FALSE, 'Guest can''t have friends (user 2 is guest)';
        RETURN ;
    END IF;

	INSERT INTO users (user_id1, user_id2)
	VALUES (_id1, _id2);
	
	RETURN QUERY SELECT TRUE, 'Friends successfully created';

EXCEPTION
	WHEN OTHERS THEN
		RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION new_friends(
	_email1 TEXT,
    _email2 TEXT
)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
    _type BOOLEAN;
    _id1 BOOLEAN;
    _id2 BOOLEAN;
BEGIN
    SELECT type, id INTO _type, _id1
    FROM users
    WHERE email = _email1;
    IF (_type = 'guest') THEN
        RETURN QUERY SELECT FALSE, 'Guest can''t have friends (user 1 is guest)';
        RETURN ;
    END IF;

    SELECT type, id INTO _type, _id2
    FROM users
    WHERE email = _email2;
    IF (_type = 'guest') THEN
        RETURN QUERY SELECT FALSE, 'Guest can''t have friends (user 2 is guest)';
        RETURN ;
    END IF;

	INSERT INTO users (user_id1, user_id2)
	VALUES (_id1, _id2);
	
	RETURN QUERY SELECT TRUE, 'Friends successfully created';

EXCEPTION
	WHEN OTHERS THEN
		RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;



CREATE OR REPLACE FUNCTION new_friends(
	_id1 INTEGER,
    _email2 TEXT
)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
    _type BOOLEAN;
    _id2 BOOLEAN;
BEGIN
    SELECT type INTO _type
    FROM users
    WHERE id = _id1;
    IF (_type = 'guest') THEN
        RETURN QUERY SELECT FALSE, 'Guest can''t have friends (user 1 is guest)';
        RETURN ;
    END IF;

    SELECT type, id INTO _type, _id2
    FROM users
    WHERE email = _email2;
    IF (_type = 'guest') THEN
        RETURN QUERY SELECT FALSE, 'Guest can''t have friends (user 2 is guest)';
        RETURN ;
    END IF;

	INSERT INTO users (user_id1, user_id2)
	VALUES (_id1, _id2);
	
	RETURN QUERY SELECT TRUE, 'Friends successfully created';

EXCEPTION
	WHEN OTHERS THEN
		RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;



CREATE OR REPLACE FUNCTION new_friends(
	_email1 TEXT,
    _id2 INTEGER
)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
    _type BOOLEAN;
    _id1 BOOLEAN;
BEGIN
    SELECT type, id INTO _type, _id1
    FROM users
    WHERE email = _email1;
    IF (_type = 'guest') THEN
        RETURN QUERY SELECT FALSE, 'Guest can''t have friends (user 1 is guest)';
        RETURN ;
    END IF;

    SELECT type INTO _type
    FROM users
    WHERE id = _id2;
    IF (_type = 'guest') THEN
        RETURN QUERY SELECT FALSE, 'Guest can''t have friends (user 2 is guest)';
        RETURN ;
    END IF;

	INSERT INTO users (user_id1, user_id2)
	VALUES (_id1, _id2);
	
	RETURN QUERY SELECT TRUE, 'Friends successfully created';

EXCEPTION
	WHEN OTHERS THEN
		RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION delete_friends(
    _id1 INTEGER,
    _id2 INTEGER)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
	friends_deleted BOOLEAN := FALSE;
BEGIN
	DELETE FROM friends
    WHERE (user1_id = _id1 AND user2_id = _id2)
        OR (user1_id = _id2 AND user2_id = _id1)
    RETURNING TRUE INTO friends_deleted;
	
    IF friends_deleted THEN
		RETURN QUERY SELECT TRUE, 'Friends deleted successfully';
        RETURN ;
	END IF;
	
    RETURN QUERY SELECT FALSE, 'Friends not found (delete fail)';
EXCEPTION
	WHEN OTHERS THEN
    	RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;



CREATE OR REPLACE FUNCTION delete_friends(
    _id1 INTEGER,
    _email2 TEXT)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
	friends_deleted BOOLEAN := FALSE;
BEGIN

	DELETE FROM friends
    WHERE (user1_id = _id1 AND user2_id = (SELECT id FROM users WHERE email = _email2))
        OR (user2_id = _id1 AND user1_id = (SELECT id FROM users WHERE email = _email2))
    RETURNING TRUE INTO friends_deleted;
	
    IF friends_deleted THEN
		RETURN QUERY SELECT TRUE, 'Friends deleted successfully';
        RETURN ;
	END IF;
	
    RETURN QUERY SELECT FALSE, 'Friends not found (delete fail)';
EXCEPTION
	WHEN OTHERS THEN
    	RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;



CREATE OR REPLACE FUNCTION delete_friends(
    _email1 INTEGER,
    _id2 TEXT)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
	friends_deleted BOOLEAN := FALSE;
BEGIN
    
	DELETE FROM friends
    WHERE (user1_id = _id2 AND user2_id = (SELECT id FROM users WHERE email = _email1))
        OR (user2_id = _id2 AND user1_id = (SELECT id FROM users WHERE email = _email1))
    RETURNING TRUE INTO friends_deleted;
	
    IF friends_deleted THEN
		RETURN QUERY SELECT TRUE, 'Friends deleted successfully';
        RETURN ;
	END IF;
	
    RETURN QUERY SELECT FALSE, 'Friends not found (delete fail)';
EXCEPTION
	WHEN OTHERS THEN
    	RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;



CREATE OR REPLACE FUNCTION delete_friends(
    _email1 INTEGER,
    _email2 TEXT)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
	friends_deleted BOOLEAN := FALSE;
BEGIN
	DELETE FROM friends
    WHERE (user1_id = (SELECT id FROM users WHERE email = _email1) AND user2_id = (SELECT id FROM users WHERE email = _email2))
        OR (user2_id = (SELECT id FROM users WHERE email = _email1) AND user1_id = (SELECT id FROM users WHERE email = _email2))
    RETURNING TRUE INTO friends_deleted;
	
    IF friends_deleted THEN
		RETURN QUERY SELECT TRUE, 'Friends deleted successfully';
        RETURN ;
	END IF;
	
    RETURN QUERY SELECT FALSE, 'Friends not found (delete fail)';
EXCEPTION
	WHEN OTHERS THEN
    	RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION get_friends()
RETURNS TABLE(success BOOLEAN, msg TEXT, user_friends []) AS $$
DECLARE
BEGIN
EXCEPTION
	WHEN OTHERS THEN
    	RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plgsql;