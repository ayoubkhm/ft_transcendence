FROM postgres

WORKDIR /db

# https://hub.docker.com/_/postgres : when postgre init db, execute every .sh/.sql in /docker-entrypoint-initdb.d/

COPY init-db/init-db_user.sql									/app/db-init/init-db_user.template.sql
COPY games/games/games.sql										/app/db-init/games.template.sql
COPY games/games/game_CRUD.sql									/app/db-init/game_CRUD.template.sql
COPY games/tournaments/tournaments.sql							/app/db-init/tournaments.template.sql
COPY games/tournaments/tournament_CRUD.sql						/app/db-init/tournament_CRUD.template.sql
COPY games/tournaments/pairing.sql								/app/db-init/pairing.template.sql
COPY users/channels_users/channels_users.sql					/app/db-init/channels_users.template.sql
COPY users/friends/friends.sql									/app/db-init/friends.template.sql
COPY users/friends/friends_CRUD.sql								/app/db-init/friends_CRUD.template.sql
COPY users/invites/invites.sql									/app/db-init/invites.template.sql
COPY users/tournaments_players/tournaments_players.sql			/app/db-init/tournaments_players.template.sql
COPY users/tournaments_players/tournaments_players_CRUD.sql		/app/db-init/tournaments_players_CRUD.template.sql
COPY users/users/user_CRUD.sql									/app/db-init/user_CRUD.template.sql
COPY users/users/users.sql										/app/db-init/users.template.sql
COPY users/users/suggest.sql									/app/db-init/suggest_users.template.sql
COPY users/users/2fa.sql										/app/db-init/2fa.template.sql
COPY messages/channels/channels.sql								/app/db-init/channels.template.sql
COPY messages/dms/dms.sql										/app/db-init/dms.template.sql
COPY messages/messages/messages.sql								/app/db-init/messages.template.sql
COPY messages/messages/messages_CRUD.sql						/app/db-init/messages_CRUD.template.sql
COPY init-db/init-db.sh 										/docker-entrypoint-initdb.d/init-db.sh
COPY test/										/app/db-test/

RUN apt-get update && apt-get install -y gettext && rm -rf /var/lib/apt/lists/* && \
	chown -R postgres:postgres /db && \
	chown -R postgres:postgres /docker-entrypoint-initdb.d && \
	cat /app/db-init/init-db_user.template.sql \
		/app/db-init/users.template.sql /app/db-init/user_CRUD.template.sql /app/db-init/2fa.template.sql /app/db-init/suggest_users.template.sql \
		/app/db-init/invites.template.sql \
		/app/db-init/friends.template.sql /app/db-init/friends_CRUD.template.sql \
		/app/db-init/tournaments.template.sql /app/db-init/tournament_CRUD.template.sql /app/db-init/pairing.template.sql \
		/app/db-init/tournaments_players.template.sql /app/db-init/tournaments_players_CRUD.template.sql \
		/app/db-init/games.template.sql /app/db-init/game_CRUD.template.sql \
		/app/db-init/channels.template.sql \
		/app/db-init/channels_users.template.sql \
		/app/db-init/dms.template.sql \
		/app/db-init/messages.template.sql /app/db-init/messages_CRUD.template.sql \
		> /app/db-init/init-db-all.template.sql && \
	if [ -z "$TEST" ]; then \
		sh -c 'cat /app/db-test/*.sql >> /app/db-init/init-db-all.template.sql'; \
    fi && \
	chmod +x /docker-entrypoint-initdb.d/init-db.sh /app/db-init/init-db-all.template.sql

CMD ["postgres", "-c", "listen_addresses=*", "-c", "port=5432"]
