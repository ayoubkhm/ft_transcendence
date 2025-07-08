DO $$
BEGIN

    PERFORM new_user('mehdi');
    PERFORM new_user('goulven');
    PERFORM new_user('ayoub');
    PERFORM new_user('gino');
    PERFORM new_user('octoross');

    PERFORM new_tournament('ouais');

    PERFORM join_tournament(1, 'ouais');
    PERFORM join_tournament(3, 'ouais');
    PERFORM join_tournament(4, 'ouais');

    PERFORM start_tournament('ouais');
    
    RAISE NOTICE 'Initialisation terminée avec succès';

EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Erreur durant l''initialisation: %', SQLERRM;
END $$;