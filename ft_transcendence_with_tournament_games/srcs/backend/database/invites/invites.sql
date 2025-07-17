CREATE TYPE invite_type AS ENUM ('friend');

CREATE TABLE IF NOT EXISTS invites (
	from_id INTEGER NOT NULL REFERENCES users(id),
	to_id INTEGER NOT NULL REFERENCES users(id),
	type invite_type NOT NULL DEFAULT 'friend'
);