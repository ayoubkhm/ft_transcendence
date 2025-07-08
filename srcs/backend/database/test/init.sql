SELECT * FROM new_user('mehdi');
SELECT * FROM new_user('goulven');
SELECT * FROM new_user('ayoub');
SELECT * FROM new_user('gino');
SELECT * FROM new_user('octoross');

SELECT * FROM new_tournament('ouais');

SELECT * FROM join_tournament(1, 'ouais');
SELECT * FROM join_tournament(3, 'ouais');
SELECT * FROM join_tournament(4, 'ouais');

UPDATE tournaments SET round = 1, total_rounds = 2 WHERE name = 'ouais';

SELECT * FROM pair_tournament('ouais');