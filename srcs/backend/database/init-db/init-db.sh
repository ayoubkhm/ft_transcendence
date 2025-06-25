#!/bin/bash
set -e
# envsubst < /usr/bin/init-db.sql > /docker-entrypoint-initdb.d/init-db.sql
envsubst < /app/db-init/init-db-all.template.sql > /tmp/init-db-all.sql

chmod +x /tmp/init-db-all.sql

# Exécution immédiate via psql (et non en comptant sur docker-entrypoint)
psql --username="$DB_SUPERUSER" --dbname="$DB_NAME" --file=/tmp/init-db-all.sql
