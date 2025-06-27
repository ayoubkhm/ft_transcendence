CREATE TYPE pending_type AS ENUM ('friend', 'vs', 'tournament');

CREATE TABLE IF NOT EXISTS pending (
	from_id INTEGER NOT NULL REFERENCES users(id),
	to_id INTEGER NOT NULL REFERENCES users(id),
	type pending_type NOT NULL DEFAULT 'friend'
);