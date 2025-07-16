CREATE TYPE game_state AS ENUM ('WAITING', 'RUNNING', 'PAUSE', 'OVER');
CREATE TYPE game_type AS ENUM ('IA', 'TOURNAMENT', 'VS');

CREATE TYPE public_game AS (

);

CREATE TABLE IF NOT EXISTS games (
	id SERIAL PRIMARY KEY,
	p1_id INTEGER DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL,
	p2_id INTEGER DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL,
	state game_state NOT NULL DEFAULT 'WAITING',
	p1_score INT NOT NULL DEFAULT 0,
  	p2_score INT NOT NULL DEFAULT 0,
	p1_bot BOOLEAN NOT NULL DEFAULT FALSE,
	p2_bot BOOLEAN NOT NULL DEFAULT FALSE,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	type game_type NOT NULL,
	-- winner is p1 if true else p2
	winner BOOLEAN DEFAULT NULL,
	tournament_id INTEGER DEFAULT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
	tournament_round INTEGER DEFAULT NULL,
	p1_winnerof INTEGER DEFAULT NULL REFERENCES games(id),
	p2_winnerof INTEGER DEFAULT NULL REFERENCES games(id)
);


CREATE OR REPLACE FUNCTION enforce_game_constraints() RETURNS trigger AS $$
BEGIN
	IF ((NEW.p1_winnerof IS NOT NULL) OR (NEW.p2_winnerof IS NOT NULL)) AND (NEW.type != 'TOURNAMENT') THEN
		RAISE EXCEPTION 'Games that depends on another are to be part of a tournament';
	END IF;

	IF (((NEW.p1_bot = TRUE) OR (NEW.p2_bot = TRUE)) AND (NEW.type = 'TOURNAMENT')) THEN
		RAISE EXCEPTION 'Tournaments can''t have bots';
	END IF;
	
	IF (NEW.p1_bot = TRUE) AND ((NEW.p1_id iS NOT NULL) OR (NEW.p1_winnerof IS NOT NULL)) THEN
    	RAISE EXCEPTION 'Player 1 is a bot and can''t have user id';
	ELSIF ((NEW.p1_bot = FALSE) AND (NEW.p1_id IS NULL) AND (NEW.p1_winnerof IS NULL)) IS NULL THEN
    	RAISE EXCEPTION 'Player 1 is not a bot and should have user id (game doesnt depend on another)';
	END IF;

	IF (NEW.p2_bot = TRUE) AND ((NEW.p2_id iS NOT NULL) OR (NEW.p2_winnerof IS NOT NULL)) THEN
    	RAISE EXCEPTION 'Player 1 is a bot and can''t have user id';
	ELSIF ((NEW.p2_bot = FALSE) AND (NEW.p2_id IS NOT NULL) AND (NEW.p2_winnerof IS NULL)) IS NULL THEN
    	RAISE EXCEPTION 'Player 1 is not a bot and should have user id (game doesnt depend on another)';
	END IF;

	IF (NEW.type = 'TOURNAMENT') AND ((NEW.tournament_id IS NULL) OR (NEW.tournament_round IS NULL)) THEN
		RAISE EXCEPTION 'Game is of tournament type but tournament_id or tournament_round is null';
	ELSIF (NEW.tournament_id IS NOT NULL) AND (NEW.type != 'TOURNAMENT') THEN
		RAISE EXCEPTION 'For game to have tournament id, it should also have tournament type';
	ELSIF (NEW.tournament_round IS NULL) AND (NEW.type != 'TOURNAMENT') THEN
		RAISE EXCEPTION 'For game to have tournament round, it should also have tournament type';
	END IF;

	IF (NEW.tournament_round IS NOT NULL) AND (NEW.tournament_round < 0) THEN
		RAISE EXCEPTION 'Tournament round can''t be negative';
	END IF;

	IF (NEW.winner IS NOT NULL) AND (NEW.state != 'OVER') THEN
		RAISE EXCEPTION 'Game has a winner but isn''t over';
	ELSIF (NEW.winner IS NULL) AND (NEW.state = 'OVER') THEN
		RAISE EXCEPTION 'Game is over but has no winner';
	END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION enforce_ugame_constraints() RETURNS trigger AS $$
BEGIN
	IF NEW.type = 'TOURNAMENT' AND (NEW.tournament_id IS NULL OR NEW.tournament_round IS NULL) THEN
		RAISE EXCEPTION 'Game is of tournament type but tournament_id or tournament_round is null';
	ELSIF NEW.tournament_id IS NOT NULL AND NEW.type != 'TOURNAMENT' THEN
		RAISE EXCEPTION 'For game to have tournament id, it should also have tournament type';
	ELSIF NEW.tournament_round IS NULL AND NEW.type != 'TOURNAMENT' THEN
		RAISE EXCEPTION 'For game to have tournament round, it should also have tournament type';
	END IF;

	IF NEW.tournament_round IS NOT NULL AND NEW.tournament_round < 1 THEN
		RAISE EXCEPTION 'Tournament round can''t be negative or zero';
	END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_game
BEFORE INSERT ON games
FOR EACH ROW EXECUTE FUNCTION enforce_game_constraints();

CREATE TRIGGER trg_game_update
BEFORE UPDATE ON games
FOR EACH ROW EXECUTE FUNCTION enforce_ugame_constraints();

GRANT ALL PRIVILEGES ON TABLE games TO ${DB_USER};


CREATE OR REPLACE FUNCTION delete_game_if_all_players_deleted()
RETURNS TRIGGER AS $$
BEGIN
	IF NEW.p1_id IS NULL AND NEW.p2_id IS NULL
    		AND NEW.p1_bot = FALSE AND NEW.p2_bot = FALSE
			AND  NEW.type != 'TOURNAMENT' THEN
			DELETE FROM games WHERE id = NEW.id;
    	-- RAISE NOTICE 'Deleting game %: both players are deleted and were humans', NEW.id; TODO faire de beaux logs
		RETURN NULL;
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_delete_game_if_all_players_deleted
AFTER UPDATE ON games
FOR EACH ROW
WHEN (
  OLD.p1_id IS NOT NULL OR OLD.p2_id IS NOT NULL
)
EXECUTE FUNCTION delete_game_if_all_players_deleted();
