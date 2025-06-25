
CREATE TABLE IF NOT EXISTS users (
	id SERIAL PRIMARY KEY,
	name TEXT NOT NULL UNIQUE,
	type TEXT NOT NULL CHECK (type IN ('guest', 'signed', 'oauth')),
	admin BOOLEAN NOT NULL DEFAULT FALSE,
	email TEXT UNIQUE DEFAULT NULL,		-- nullable pour guest
	password TEXT DEFAULT NULL,			-- nullable pour guest
	created_at TIMESTAMP DEFAULT NOW()
);


CREATE OR REPLACE FUNCTION enforce_user_constraints() RETURNS trigger AS $$
BEGIN
	IF NEW.type = 'signed' AND (NEW.email IS NULL OR NEW.password IS NULL) THEN
    	RAISE EXCEPTION 'Signed users must have email and password';
	ELSIF NEW.type = 'oauth' THEN
		IF NEW.password IS NOT NULL then 
			RAISE EXCEPTION 'Signed-in users via OAuth dont have password';
		ELSIF NEW.email IS NULL then
			RAISE EXCEPTION 'Signed-in users must have email';
		END IF;
	ELSIF NEW.type = 'guest' AND (NEW.email IS NOT NULL OR NEW.password IS NOT NULL) THEN
		RAISE EXCEPTION 'Guest users cant have email or password';
	END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_user_constraints
BEFORE INSERT OR UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION enforce_user_constraints();

GRANT ALL PRIVILEGES ON TABLE users TO ${DB_USER};
