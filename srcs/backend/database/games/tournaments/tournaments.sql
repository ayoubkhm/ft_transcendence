CREATE TYPE tournament_state AS ENUM ('LOBBY', 'RUNNING', 'OVER');

CREATE TABLE IF NOT EXISTS tournaments (
	id SERIAL PRIMARY KEY,
	name TEXT NOT NULL UNIQUE,
	min_players INTEGER NOT NULL DEFAULT 2,
	max_players INTEGER NOT NULL DEFAULT 32,
	nbr_players INTEGER NOT NULL DEFAULT 0,
	total_rounds INTEGER NOT NULL DEFAULT 1,
	round INTEGER NOT NULL DEFAULT 0,
	state tournament_state NOT NULL DEFAULT 'LOBBY',
	owner_id INTEGER NOT NULL REFERENCES users(id),
	winner_id INTEGER DEFAULT NULL REFERENCES users(id)
);


CREATE OR REPLACE FUNCTION enforce_tournament_constraints() RETURNS trigger AS $$
BEGIN
	IF (NEW.round > 1) AND (NEW.state = 'LOBBY') THEN
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
	ELSIF (NEW.nbr_players > NEW.max_players) THEN
		RAISE EXCEPTION 'Tournaments has reached maximum players, cant add new player';
	END IF;
	
	IF (NEW.max_players < NEW.min_players) THEN
		RAISE EXCEPTION 'Can''t have max players % < to min players %', NEW.max_players, NEW.min_players;
	END IF;

	IF (LENGTH(NEW.name) > 20) THEN
		RAISE EXCEPTION 'Tournament name cannot exceed 20 characters';
	END IF;

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_tournament_constraints
BEFORE INSERT OR UPDATE ON tournaments
FOR EACH ROW EXECUTE FUNCTION enforce_tournament_constraints();
