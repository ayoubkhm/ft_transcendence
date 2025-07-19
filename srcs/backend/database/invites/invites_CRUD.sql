
CREATE OR REPLACE FUNCTION new_invite(
	_from_user_id INTEGER,
    _to_user_id INTEGER,
    _type invite_type DEFAULT 'friend'
)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
    _from_user_type TEXT;
    _to_user_type TEXT;
BEGIN
    SELECT type INTO _from_user_type
    FROM users
    WHERE id = _from_user_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'User from not found';
        RETURN;
    END IF;

    IF (_type = 'friend') AND (_from_user_type = 'guest') THEN
        RETURN QUERY SELECT FALSE, 'Guest can''t make friends';
        
    END IF;

    SELECT type INTO _to_user_type
    FROM users WHERE id = _to_user_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'User to not found';
        RETURN;
    END IF;
	

    IF _type = 'friend' THEN
        IF _to_user_type = 'guest' THEN
            RETURN QUERY SELECT FALSE, 'Can''t make friends with guest';
            
        END IF;

        IF EXISTS(
            SELECT 1 FROM friends
            WHERE ((user1_id = _from_user_id) AND (user2_id = _to_user_id))
                OR ((user1_id = _to_user_id) AND (user2_id = _from_user_id))) THEN
                RETURN QUERY SELECT FALSE, 'Users are already friends';
                
        END IF;
    END IF;

    IF EXISTS (
        SELECT 1 FROM invites
        WHERE from_id = _from_user_id
            AND to_id = _to_user_id
            AND type = _type
    ) THEN
        RETURN QUERY SELECT FALSE, 'Invite already exists';
        
    END IF;

    INSERT INTO invites (from_id, to_id, type)
    VALUES (_from_user_id, _to_user_id, _type);
	
	RETURN QUERY SELECT TRUE, 'Invite created successfully';

EXCEPTION
    WHEN OTHERS THEN
	    RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;



CREATE OR REPLACE FUNCTION new_invite(
	_from_user_email TEXT,
    _to_user_id INTEGER,
    _type invite_type DEFAULT 'friend'
)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
    _from_user_id INTEGER;
    _from_user_type TEXT;
    _to_user_type TEXT;
BEGIN
    SELECT id, type INTO _from_user_id, _from_user_type
    FROM users
    WHERE email = _from_user_email;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'User from not found';
        RETURN;
    END IF;

    IF _type = 'friend' AND _from_user_type = 'guest' THEN
        RETURN QUERY SELECT FALSE, 'Guest can''t make friends';
        
    END IF;

    SELECT type INTO _to_user_type
    FROM users WHERE id = _to_user_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'User to not found';
        RETURN;
    END IF;
	
    IF _type = 'friend' THEN
        IF _to_user_type = 'guest' THEN
            RETURN QUERY SELECT FALSE, 'Can''t make friends with guest';
            
        END IF;

        IF EXISTS(
            SELECT 1 FROM friends
            WHERE ((user1_id = _from_user_id) AND (user2_id = _to_user_id))
                OR ((user1_id = _to_user_id) AND (user2_id = _from_user_id))) THEN
                RETURN QUERY SELECT FALSE, 'Users are already friends';
                
        END IF;
    END IF;

    IF EXISTS (
        SELECT 1 FROM invites
        WHERE from_id = _from_user_id
            AND to_id = _to_user_id
            AND type = _type
    ) THEN
        RETURN QUERY SELECT FALSE, 'Invite already exists';
        
    END IF;

    INSERT INTO invites (from_id, to_id, type)
    VALUES (_from_user_id, _to_user_id, _type);
	
	RETURN QUERY SELECT TRUE, 'Invite created successfully';

EXCEPTION
	WHEN OTHERS THEN
	    RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;



CREATE OR REPLACE FUNCTION new_invite(
	_from_user_id INTEGER,
    _to_user_email TEXT,
    _type invite_type DEFAULT 'friend'
)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
    _to_user_id INTEGER;
    _from_user_type TEXT;
    _to_user_type TEXT;
BEGIN
    SELECT type INTO _from_user_type
    FROM users WHERE id = _from_user_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'User from not found';
        RETURN;
    END IF;

    IF _from_user_type = 'guest' THEN
        RETURN QUERY SELECT FALSE, 'Guest can''t make friends';
        
    END IF;


    SELECT id, type INTO _to_user_id, _to_user_type
    FROM users
    WHERE email = _to_user_email;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'User to not found';
        RETURN;
    END IF;

	
    IF _type = 'friend' THEN
        IF _to_user_type = 'guest' THEN
            RETURN QUERY SELECT FALSE, 'Can''t make friends with guest';
            
        END IF;
        
        IF EXISTS(
            SELECT 1 FROM friends
            WHERE ((user1_id = _from_user_id) AND (user2_id = _to_user_id))
                OR ((user1_id = _to_user_id) AND (user2_id = _from_user_id))) THEN
                RETURN QUERY SELECT FALSE, 'Users are already friends';
                
        END IF;
    END IF;

    IF EXISTS (
        SELECT 1 FROM invites
        WHERE from_id = _from_user_id
            AND to_id = _to_user_id
            AND type = _type
    ) THEN
        RETURN QUERY SELECT FALSE, 'Invite already exists';
        
    END IF;

    INSERT INTO invites (from_id, to_id, type)
    VALUES (_from_user_id, _to_user_id, _type);
	
	RETURN QUERY SELECT TRUE, 'Invite created successfully';

EXCEPTION
    WHEN OTHERS THEN
	    RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;



CREATE OR REPLACE FUNCTION new_invite(
	_from_user_email TEXT,
    _to_user_email TEXT,
    _type invite_type DEFAULT 'friend'
)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
    _from_user_id INTEGER;
    _to_user_id INTEGER;
    _from_user_type TEXT;
    _to_user_type TEXT;
BEGIN
    SELECT id, type INTO _from_user_id, _from_user_type
    FROM users
    WHERE email = _from_user_email;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'User from not found';
        RETURN;
    END IF;
	
    IF _from_user_type = 'guest' THEN
        RETURN QUERY SELECT FALSE, 'Guest can''t make friends';
        
    END IF;

    SELECT id, type INTO _to_user_id, _to_user_type
    FROM users
    WHERE email = _to_user_email;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'User to not found';
        RETURN;
    END IF;

    IF _type = 'friend' THEN
        IF _to_user_type = 'guest' THEN
            RETURN QUERY SELECT FALSE, 'Can''t make friends with guest';
            
        END IF;

        IF EXISTS(
            SELECT 1 FROM friends
            WHERE ((user1_id = _from_user_id) AND (user2_id = _to_user_id))
                OR ((user1_id = _to_user_id) AND (user2_id = _from_user_id))) THEN
                RETURN QUERY SELECT FALSE, 'Users are already friends';
                
        END IF;
    END IF;

    IF EXISTS (
        SELECT 1 FROM invites
        WHERE from_id = _from_user_id
            AND to_id = _to_user_id
            AND type = _type
    ) THEN
        RETURN QUERY SELECT FALSE, 'Invite already exists';
        
    END IF;

    INSERT INTO invites (from_id, to_id, type)
    VALUES (_from_user_id, _to_user_id, _type);
	
	RETURN QUERY SELECT TRUE, 'Invite created successfully';

EXCEPTION
    WHEN OTHERS THEN
	    RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;




CREATE OR REPLACE FUNCTION delete_invite(
    _from_user_id INTEGER,
    _to_user_id INTEGER,
    _type invite_type DEFAULT 'friend')
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
	invite_deleted BOOLEAN;
BEGIN
	DELETE FROM invites
    WHERE from_id = _from_user_id
        AND to_id = _to_user_id
        AND type = _type
    RETURNING TRUE INTO invite_deleted;
	
    IF invite_deleted THEN
		RETURN QUERY SELECT TRUE, 'Invite deleted successfully';
	ELSE
		RETURN QUERY SELECT FALSE, 'No invite found (delete fail)';
	END IF;
EXCEPTION
	WHEN OTHERS THEN
    	RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;



CREATE OR REPLACE FUNCTION delete_invite(
    _from_user_email TEXT,
    _to_user_id INTEGER,
    _type invite_type DEFAULT 'friend')
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
	invite_deleted BOOLEAN;
    _from_user_id INTEGER;
BEGIN
    SELECT id INTO _from_user_id
    FROM users
    WHERE email = _from_user_email;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, FORMAT('User from not found with email %s (delete invite fail)', _from_user_email);
        
    END IF;

	DELETE FROM invites
    WHERE from_id = _from_user_id
        AND to_id = _to_user_id
        AND type = _type
    RETURNING TRUE INTO invite_deleted;
	
    IF invite_deleted THEN
		RETURN QUERY SELECT TRUE, 'Invite deleted successfully';
	ELSE
		RETURN QUERY SELECT FALSE, 'No invite found (delete fail)';
	END IF;
EXCEPTION
	WHEN OTHERS THEN
    	RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;



CREATE OR REPLACE FUNCTION delete_invite(
    _from_user_id INTEGER,
    _to_user_email TEXT,
    _type invite_type DEFAULT 'friend')
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
	invite_deleted BOOLEAN;
    _to_user_id INTEGER;
BEGIN
    SELECT id INTO _to_user_id
    FROM users
    WHERE email = _to_user_email;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, FORMAT('User to not found with email %s (delete invite fail)', _to_user_email);
        
    END IF;

	DELETE FROM invites
    WHERE from_id = _from_user_id
        AND to_id = _to_user_id
        AND type = _type
    RETURNING TRUE INTO invite_deleted;
	
    IF invite_deleted THEN
		RETURN QUERY SELECT TRUE, 'Invite deleted successfully';
	ELSE
		RETURN QUERY SELECT FALSE, 'No invite found (delete fail)';
	END IF;
EXCEPTION
	WHEN OTHERS THEN
    	RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;



CREATE OR REPLACE FUNCTION delete_invite(
    _from_user_email TEXT,
    _to_user_email TEXT,
    _type invite_type DEFAULT 'friend')
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
DECLARE
	invite_deleted BOOLEAN;
	_from_user_id INTEGER;
	_to_user_id INTEGER;
BEGIN
    SELECT id INTO _from_user_id
    FROM users
    WHERE email = _from_user_email;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, FORMAT('User from not found with email %s (delete invite fail)', _from_user_email);
        
    END IF;

    SELECT id INTO _to_user_id
    FROM users
    WHERE email = _to_user_email;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, FORMAT('User to not found with email %s (delete invite fail)', _to_user_email);
        
    END IF;

	DELETE FROM invites
    WHERE from_id = _from_user_id
        AND to_id = _to_user_id
        AND type = _type
    RETURNING TRUE INTO invite_deleted;
	
    IF invite_deleted THEN
		RETURN QUERY SELECT TRUE, 'Invite deleted successfully';
	ELSE
		RETURN QUERY SELECT FALSE, 'No invite found (delete fail)';
	END IF;
EXCEPTION
	WHEN OTHERS THEN
    	RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;




-- CREATE OR REPLACE FUNCTION get_friends_invites(
--     _user_email TEXT)
-- RETURNS TABLE(success BOOLEAN, msg TEXT, ) AS $$
-- DECLARE
-- 	_user_id INTEGER;
-- BEGIN
--     SELECT id INTO _user_id
--     FROM users
--     WHERE email = _user_email;

--     IF NOT FOUND THEN
--         RETURN QUERY SELECT FALSE, FORMAT('User not found with email %s (get invite fail)', _user_email);
--         
--     END IF;

--     RETURN QUERY SELECT TRUE, 
-- EXCEPTION
-- 	WHEN OTHERS THEN
--     	RETURN QUERY SELECT FALSE, SQLERRM;
-- END;
-- $$ LANGUAGE plpgsql;


