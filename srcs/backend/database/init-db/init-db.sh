#!/bin/bash
set -e
# envsubst < /usr/bin/init-db.sql > /docker-entrypoint-initdb.d/init-db.sql
envsubst < /app/db-init/init-db.template.sql > /tmp/init-db.sql
envsubst < /app/db-init/games.template.sql > /tmp/init-db/games.sql
envsubst < /app/db-init/game_CRUD.template.sql > /tmp/init-db/.sql
envsubst < /app/db-init/users.template.sql > /tmp/init-db/users.sql
envsubst < /app/db-init/user_CRUD.template.sql > /tmp/init-db/user_CRUD.sql
envsubst < /app/db-init/tournaments.template.sql > /tmp/init-db/tournaments.sql
envsubst < /app/db-init/tournament_CRUD.template.sql > /tmp/init-db/tournament_CRUD.sql

cat /tmp/init-db.sql /tmp/games.sql /tmp/game_CRUD.sql /tmp/users.sql /tmp/user_CRUD.sql /tmp/tournaments.sql /tmp/tournament_CRUD.sql > /tmp/init-db-all.sql
chmod +x /tmp/init-db-all.sql

# Exécution immédiate via psql (et non en comptant sur docker-entrypoint)
psql -U "$DB_USER" -d "$DB_NAME" -f /tmp/init-db-all.sql
