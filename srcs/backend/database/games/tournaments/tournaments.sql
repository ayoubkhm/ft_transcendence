CREATE TYPE tournament_state AS ENUM ('WAITING', 'RUNNING', 'OVER');

CREATE TABLE IF NOT EXISTS tournaments (
	id SERIAL PRIMARY KEY,
	name TEXT NOT NULL UNIQUE,
	nbr_players INTEGER NOT NULL DEFAULT 0,
	total_rounds INTEGER NOT NULL DEFAULT 0,
	round INTEGER NOT NULL DEFAULT 0,
	pairing INTEGER NOT NULL DEFAULT 0,
	state tournament_state NOT NULL DEFAULT 'WAITING'
);


CREATE OR REPLACE FUNCTION enforce_tournament_constraints() RETURNS trigger AS $$
BEGIN
	IF (NEW.remaining_rounds < 0) OR (NEW.total_rounds < 0) THEN
		RAISE EXCEPTION 'Tournament can''t have a number of rounds negative';
	END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_tournament_constraints
BEFORE INSERT OR UPDATE ON tournaments
FOR EACH ROW EXECUTE FUNCTION enforce_tournament_constraints();
