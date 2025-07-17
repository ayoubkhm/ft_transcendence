#!/bin/bash
set -e

envsubst < /app/db-init/init-db-all.template.sql > /tmp/init-db-all.sql
chmod +x /tmp/init-db-all.sql

PGPASSWORD="$POSTGRES_PASSWORD" psql --username="$POSTGRES_USER" --dbname="$DB_NAME" --file=/tmp/init-db-all.sql

