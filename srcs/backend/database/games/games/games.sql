CREATE TYPE game_state AS ENUM ('WAITING', 'RUNNING', 'PAUSE', 'OVER');
CREATE TYPE game_type AS ENUM ('IA', 'TOURNAMENT', 'VS');

CREATE TABLE IF NOT EXISTS games (
	id SERIAL PRIMARY KEY,
	p1_id INTEGER DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL,
	p2_id INTEGER DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL,
	state game_state NOT NULL DEFAULT 'RUNNING',
	p1_score INT NOT NULL DEFAULT 0,
  	p2_score INT NOT NULL DEFAULT 0,
	p1_bot BOOLEAN NOT NULL DEFAULT FALSE,
	p2_bot BOOLEAN NOT NULL DEFAULT FALSE,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	type game_type NOT NULL,
	tournament_id INTEGER DEFAULT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
	tournament_round INTEGER DEFAULT NULL
);


CREATE OR REPLACE FUNCTION enforce_game_constraints() RETURNS trigger AS $$
BEGIN
	IF NEW.p1_bot = TRUE AND NEW.p1_id IS NULL THEN
    	RAISE EXCEPTION 'Player 1 is not a bot and should have user id';

	ELSIF NEW.p2_bot = TRUE AND NEW.p2_id IS NULL THEN
    	RAISE EXCEPTION 'Player 2 is not a bot and should have user id';
	
	ELSIF NEW.tournament_id IS NOT NULL AND NEW.type != 'TOURNAMENT' THEN
		RAISE EXCEPTION 'For game to have tournament id, it should also have tournament type';
	ELSIF NEW.tournament_id IS NULL AND NEW.type = 'TOURNAMENT' THEN
		RAISE EXCEPTION 'For game to have tournament type, it should also have tournament id';
	ELSIF NEW.tournament_round IS NOT NULL AND NEW.tournament_round < 1 THEN
		RAISE EXCEPTION 'Tournament round can''t be negative or zero';
	ELSIF NEW.tournament_round IS NOT NULL AND NEW.tournament_id IS NULL THEN
		RAISE EXCEPTION 'Can''t have tournament round if not a tournament';
		
	END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_game_constraints
BEFORE INSERT OR UPDATE ON games
FOR EACH ROW EXECUTE FUNCTION enforce_game_constraints();

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