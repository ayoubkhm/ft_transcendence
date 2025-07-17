CREATE OR REPLACE FUNCTION new_friends(
	_id1 INTEGER,
    _id2 INTEGER
)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
    _type TEXT;
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

	IF EXISTS(
        SELECT 1 FROM friends
        WHERE ((user1_id = _id1) AND (user2_id = _id2))
            OR ((user1_id = _id2) AND (user2_id = _id1))
    ) THEN
        RETURN QUERY SELECT FALSE, 'Already friends';
        RETURN ;
    END IF;
    
    INSERT INTO friends (user1_id, user2_id)
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
    _type TEXT;
    _id1 INTEGER;
    _id2 INTEGER;
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

	IF EXISTS(
        SELECT 1 FROM friends
        WHERE ((user1_id = _id1) AND (user2_id = _id2))
            OR ((user1_id = _id2) AND (user2_id = _id1))
    ) THEN
        RETURN QUERY SELECT FALSE, 'Already friends';
        RETURN ;
    END IF;
    
    INSERT INTO friends (user1_id, user2_id)
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
    _type TEXT;
    _id2 INTEGER;
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

	IF EXISTS(
        SELECT 1 FROM friends
        WHERE ((user1_id = _id1) AND (user2_id = _id2))
            OR ((user1_id = _id2) AND (user2_id = _id1))
    ) THEN
        RETURN QUERY SELECT FALSE, 'Already friends';
        RETURN ;
    END IF;
    
    INSERT INTO friends (user1_id, user2_id)
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
    _type TEXT;
    _id1 INTEGER;
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

	IF EXISTS(
        SELECT 1 FROM friends
        WHERE ((user1_id = _id1) AND (user2_id = _id2))
            OR ((user1_id = _id2) AND (user2_id = _id1))
    ) THEN
        RETURN QUERY SELECT FALSE, 'Already friends';
        RETURN ;
    END IF;
    
    INSERT INTO friends (user1_id, user2_id)
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
    _email1 TEXT,
    _id2 INTEGER)
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
    _email1 TEXT,
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



CREATE OR REPLACE FUNCTION get_friends(_id INTEGER)
RETURNS TABLE (success BOOLEAN, msg TEXT, user_friends public_user[]) AS $$
DECLARE
    _user_exists BOOLEAN;
    _friends public_user[];
BEGIN
    SELECT EXISTS(SELECT 1 FROM users WHERE id = _id) INTO _user_exists;

    IF NOT _user_exists THEN
        RETURN QUERY SELECT FALSE, 'User not found', ARRAY[]::public_user[];
        RETURN;
    END IF;

    SELECT ARRAY(
        SELECT ROW(users.id, users.name, users.tag, users.email, users.avatar, users.online)::public_user
        FROM friends
        JOIN users
        ON ((users.id = friends.user1_id AND friends.user2_id = _id)
            OR (friends.user2_id = users.id AND friends.user1_id = _id))
    ) INTO _friends;

    _friends := COALESCE(_friends, ARRAY[]::public_user[]);
    RETURN QUERY SELECT TRUE, 'Friends successfully retrieved', _friends;
END;
$$ LANGUAGE plpgsql;




CREATE OR REPLACE FUNCTION get_friends(_email TEXT)
RETURNS TABLE (success BOOLEAN, msg TEXT, user_friends public_user[]) AS $$
DECLARE
    _id INTEGER;
    _friends public_user[];
BEGIN
    SELECT id INTO _id
    FROM users
    WHERE email = _email;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'User not found', ARRAY[]::public_user[];
        RETURN;
    END IF;

    SELECT ARRAY(
        SELECT ROW(users.id, users.name, users.tag, users.email, users.avatar, users.online)::public_user
        FROM friends
        JOIN users
        ON ((users.id = friends.user1_id AND friends.user2_id = _id)
            OR (friends.user2_id = users.id AND friends.user1_id = _id))
    ) INTO _friends;

    _friends := COALESCE(_friends, ARRAY[]::public_user[]);
    RETURN QUERY SELECT TRUE, 'Friends successfully retrieved', _friends;
END;
$$ LANGUAGE plpgsql;
