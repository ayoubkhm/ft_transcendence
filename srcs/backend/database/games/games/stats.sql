CREATE OR REPLACE FUNCTION score(
	_id INTEGER,
	_p1 BOOLEAN DEFAULT TRUE
)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM games WHERE id = _id) THEN
		RETURN QUERY SELECT FALSE, 'No game found to score';
		RETURN ;
	END IF;

	IF _p1 THEN
		UPDATE games SET p1_score = p1_score + 1
		WHERE id = _id;
	ELSE
		UPDATE games SET p2_score = p2_score + 1
		WHERE id = _id;
	END IF;
	RETURN QUERY SELECT TRUE, 'Game scored successfully';
	
EXCEPTION
	WHEN OTHERS THEN
		RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;



CREATE OR REPLACE FUNCTION apply_bonus(
	_id INTEGER,
	_p1 BOOLEAN DEFAULT TRUE
)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM games WHERE id = _id) THEN
		RETURN QUERY SELECT FALSE, 'No game found to apply bonus';
		RETURN ;
	END IF;

	IF _p1 THEN
		UPDATE games SET p1_bonus_count = p1_bonus_count + 1
		WHERE id = _id;
	ELSE
		UPDATE games SET p2_bonus_count = p2_bonus_count + 1
		WHERE id = _id;
	END IF;
	RETURN QUERY SELECT TRUE, 'Bonus successfully applied';
	
EXCEPTION
	WHEN OTHERS THEN
		RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION successfull_block(
	_id INTEGER,
	_p1 BOOLEAN DEFAULT TRUE
)
RETURNS TABLE(success BOOLEAN, msg TEXT) AS $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM games WHERE id = _id) THEN
		RETURN QUERY SELECT FALSE, 'No game found to apply block';
		RETURN ;
	END IF;

	IF _p1 THEN
		UPDATE games SET p1_block_count = p1_block_count + 1
		WHERE id = _id;
	ELSE
		UPDATE games SET p2_block_count = p2_block_count + 1
		WHERE id = _id;
	END IF;
	RETURN QUERY SELECT TRUE, 'Block successfully applied';
	
EXCEPTION
	WHEN OTHERS THEN
		RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION get_stats(_id INTEGER)
RETURNS jsonb AS $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM users WHERE id = _id) THEN
		RETURN '{}'::jsonb;
	END IF;

	RETURN (
		SELECT jsonb_build_object(
			'won_count', COUNT(*) FILTER (
				WHERE g.winner IS TRUE AND g.p1_id = _id
				   OR g.winner IS FALSE AND g.p2_id = _id
			),
			'lost_count', COUNT(*) FILTER (
				WHERE g.winner IS TRUE AND g.p2_id = _id
				   OR g.winner IS FALSE AND g.p1_id = _id
			),
			'block_count', SUM(
				CASE
					WHEN g.p1_id = _id THEN g.p1_block_count
					WHEN g.p2_id = _id THEN g.p2_block_count
					ELSE 0
				END
			),
			'missed_count', SUM(
				CASE
					WHEN g.p1_id = _id THEN g.p2_score
					WHEN g.p2_id = _id THEN g.p1_score
					ELSE 0
				END
			),
			'bonus_count', SUM(
				CASE
					WHEN g.p1_id = _id THEN g.p1_bonus_count
					WHEN g.p2_id = _id THEN g.p2_bonus_count
					ELSE 0
				END
			),
			'matches', (
				SELECT jsonb_agg(match)
				FROM (
					SELECT jsonb_build_object(
						'type', g.type,
						'state', g.state,
						'p1_bot', g.p1_bot,
						'p2_bot', g.p2_bot,
						'p1_name', u1.name,
						'p1_tag', u1.tag,
						'p2_name', u2.name,
						'p2_tag', u2.tag,
						'p1_score', g.p1_score,
						'p2_score', g.p2_score,
						'winner', CASE
							WHEN g.winner IS NULL THEN NULL
							WHEN g.winner = TRUE AND g.p1_id = _id THEN TRUE
							WHEN g.winner = FALSE AND g.p2_id = _id THEN TRUE
							ELSE FALSE
						END
					) AS match
					FROM games g
					LEFT JOIN users u1 ON u1.id = g.p1_id
					LEFT JOIN users u2 ON u2.id = g.p2_id
					WHERE g.p1_id = _id OR g.p2_id = _id
					ORDER BY g.created_at DESC
				) AS ordered_matches
			)
		)
		FROM games g
		WHERE g.p1_id = _id OR g.p2_id = _id
	);

-- Si une erreur SQL survient
EXCEPTION
	WHEN OTHERS THEN
		RAISE NOTICE 'get_stats error: %', SQLERRM;
		RETURN '{}'::jsonb;
END;
$$ LANGUAGE plpgsql;
