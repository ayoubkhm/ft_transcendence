CREATE TYPE tournament_state AS ENUM ('WAITING', 'RUNNING', 'OVER');

CREATE TABLE IF NOT EXISTS tournaments (
	id SERIAL PRIMARY KEY,
	name TEXT NOT NULL UNIQUE,
	nbr_players INTEGER NOT NULL,
	remaining_rounds INTEGER NOT NULL,
	state tournament_state NOT NULL DEFAULT 'WAITING'
	-- start_at TIMESTAMP DEFAULT NOW(),
);


CREATE OR REPLACE FUNCTION enforce_tournament_constraints() RETURNS trigger AS $$
BEGIN
	IF (NEW.remaining_rounds < 0) THEN
		RAISE EXCEPTION 'Tournament can''t have a number of rounds negative';
	END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_tournament_constraints
BEFORE INSERT OR UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION enforce_tournament_constraints();
