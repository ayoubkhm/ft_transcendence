CREATE TABLE IF NOT EXISTS users (
	id SERIAL PRIMARY KEY,
	name TEXT NOT NULL,
	type TEXT NOT NULL CHECK (type IN ('guest', 'signed', 'oauth')),
	admin BOOLEAN NOT NULL DEFAULT FALSE,
	email TEXT UNIQUE DEFAULT NULL,		-- nullable pour guest
	password TEXT DEFAULT NULL,			-- nullable pour guest
	created_at TIMESTAMP NOT NULL DEFAULT NOW(),
	online BOOLEAN NOT NULL DEFAULT TRUE,
	twofa_secret TEXT DEFAULT NULL,		-- nullable pour compte pas 2fa
	twofa_validated BOOLEAN DEFAULT NULL,
	active BOOLEAN NOT NULL DEFAULT TRUE		-- nullable pour 2fa pas validated
);


CREATE OR REPLACE FUNCTION enforce_user_constraints() RETURNS trigger AS $$
BEGIN
	IF NEW.type = 'signed' AND (NEW.email IS NULL OR NEW.password IS NULL) THEN
    	RAISE EXCEPTION 'Signed-in users must have email and password';
	ELSIF NEW.type = 'oauth' THEN
		IF NEW.password IS NOT NULL then 
			RAISE EXCEPTION 'OAuth users via OAuth can''t have password';
		ELSIF NEW.email IS NULL then
			RAISE EXCEPTION 'OAuth users must have email';
		END IF;
	ELSIF NEW.type = 'guest' AND (NEW.email IS NOT NULL OR NEW.password IS NOT NULL) THEN
		RAISE EXCEPTION 'Guest users can''t have email or password';
	ELSIF NEW.type = 'guest' AND (NEW.twofa_secret IS NOT NULL) THEN
		RAISE EXCEPTION '2fa accounts can''t be guest';
	END IF;
	
	IF (NEW.twofa_secret IS NULL AND NEW.twofa_validated IS NOT NULL) THEN
		RAISE EXCEPTION '2fa account mismatch: 2fa secret null and 2fa_validated not null';
	ELSIF (NEW.twofa_secret IS NOT NULL AND NEW.twofa_validated IS NULL) THEN
		RAISE EXCEPTION '2fa account mismatch: 2fa secret not null and 2fa_validated null';
	END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_user_constraints
BEFORE INSERT OR UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION enforce_user_constraints();

GRANT ALL PRIVILEGES ON TABLE users TO ${DB_USER};
