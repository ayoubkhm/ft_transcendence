FROM postgres

WORKDIR /db

# https://hub.docker.com/_/postgres : when postgre init db, execute every .sh/.sql in /docker-entrypoint-initdb.d/

COPY init-db/init-db.sql						/app/db-init/init-db.template.sql
COPY init-db/games/games.sql					/app/db-init/games.template.sql
COPY init-db/games/game_CRUD.sql				/app/db-init/game_CRUD.template.sql
COPY init-db/users/users.sql					/app/db-init/users.template.sql
COPY init-db/users/user_CRUD.sql				/app/db-init/user_CRUD.template.sql
COPY init-db/tournaments/tournament_CRUD.sql	/app/db-init/tournament_CRUD.template.sql
COPY init-db/tournaments/tournaments.sql		/app/db-init/tournaments.template.sql

COPY init-db/init-db.sh /docker-entrypoint-initdb.d/init-db.sh

RUN apt-get update && apt-get install -y gettext && rm -rf /var/lib/apt/lists/* && \
	chown -R postgres:postgres /db && \
	chown -R postgres:postgres /docker-entrypoint-initdb.d && \
	cat /app/db-init/init-db.template.sql /app/db-init/users.template.sql /app/db-init/user_CRUD.template.sql /app/db-init/games.template.sql /app/db-init/game_CRUD.template.sql /app/db-init/tournaments.template.sql /app/db-init/tournament_CRUD.template.sql > /app/db-init/init-db-all.template.sql && \
	chmod +x /docker-entrypoint-initdb.d/init-db.sh /app/db-init/init-db-all.template.sql
		chmod +x /docker-entrypoint-initdb.d/init-db.sh


CMD ["postgres", "-c", "listen_addresses=*", "-c", "port=5432"]
