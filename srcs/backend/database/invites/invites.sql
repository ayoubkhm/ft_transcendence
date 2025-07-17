CREATE TYPE invite_type AS ENUM ('friend');
-- TODO refaire tous les checks if user exi st car déjà check dans le insert or update -> insert or update on table "invites" violates foreign key constraint "invites_from_id_fkey";

CREATE TABLE IF NOT EXISTS invites (
	from_id INTEGER NOT NULL REFERENCES users(id),
	to_id INTEGER NOT NULL REFERENCES users(id),
	type invite_type NOT NULL DEFAULT 'friend'
);
