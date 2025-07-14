CREATE TYPE tournament_state AS ENUM ('PREP', 'WAITING', 'RUNNING', 'OVER');

CREATE TABLE IF NOT EXISTS tournaments (
	id SERIAL PRIMARY KEY,
	name TEXT NOT NULL UNIQUE,
	min_players INTEGER NOT NULL DEFAULT 2,
	max_players INTEGER NOT NULL DEFAULT 32,
	nbr_players INTEGER NOT NULL DEFAULT 0,
	total_rounds INTEGER NOT NULL DEFAULT 1,
	round INTEGER NOT NULL DEFAULT 0,
	state tournament_state NOT NULL DEFAULT 'PREP',
	current_round_over BOOLEAN NOT NULL DEFAULT FALSE,
	owner_id INTEGER NOT NULL REFERENCES users(id)
);


CREATE OR REPLACE FUNCTION enforce_tournament_constraints() RETURNS trigger AS $$
BEGIN
	IF (NEW.round > 0) AND (NEW.state = 'PREP') THEN
		RAISE EXCEPTION 'Tournament can''t advance its round when it is prepping';
	END IF;

	IF (NEW.round < 0) OR (NEW.total_rounds < 0) THEN
		RAISE EXCEPTION 'Tournament can''t have a number of rounds negative';
	END IF;
	IF (NEW.min_players < 2) THEN
		RAISE EXCEPTION 'Tournaments can''t have a minimum of players lesser than 2';
	END IF;
	IF (NEW.max_players < 2) THEN
		RAISE EXCEPTION 'Tournaments can''t have a maximum of players lesser than 2';
	END IF;
	IF (NEW.nbr_players < 0) THEN
		RAISE EXCEPTION 'Tournaments have a number of players negative';
	END IF;
	
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_tournament_constraints
BEFORE INSERT OR UPDATE ON tournaments
FOR EACH ROW EXECUTE FUNCTION enforce_tournament_constraints();
