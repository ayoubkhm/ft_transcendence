DO $$
BEGIN

    PERFORM new_user('mehdi', 'signed', 'mehdimail', '123');
    PERFORM new_user('goulven', 'oauth', 'goulvmail');
    PERFORM new_user('ayoub', 'oauth', 'ayoubmail');
    PERFORM new_user('gino');
    PERFORM new_user('octoross', 'signed', 'ocemail', '456');

    PERFORM new_tournament('ouais', 5);

    PERFORM join_tournament(1, 'ouais');
    PERFORM join_tournament(3, 'ouais');
    PERFORM join_tournament(4, 'ouais');

    PERFORM init_tournament('ouais');

    PERFORM new_friends('mehdimail', 'goulvmail');
    PERFORM new_friends('mehdimail', 'ayoubmail');
    PERFORM new_friends('goulvmail', 'ocemail');
    PERFORM new_friends('mehdimail', 'ocemail');
    
    RAISE NOTICE 'Initialisation terminée avec succès';

EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Erreur durant l''initialisation: %', SQLERRM;
END $$;