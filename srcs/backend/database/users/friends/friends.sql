CREATE TABLE IF NOT EXISTS friends (
	user1_id INTEGER REFERENCES users(id),
	user2_id INTEGER REFERENCES users(id)
);

