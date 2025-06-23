#!/bin/bash
set -e
# envsubst < /usr/bin/init-db.sql > /docker-entrypoint-initdb.d/init-db.sql
envsubst < /usr/bin/init-db.template.sql > /tmp/init-db.sql
echo "ON A ENVSUBST"
cat /tmp/init-db.sql
echo "END OF TRUC BIDULE"
chmod +x /tmp/init-db.sql

# Exécution immédiate via psql (et non en comptant sur docker-entrypoint)
psql -U "$DB_USER" -d "$DB_NAME" -f /tmp/init-db.sql
