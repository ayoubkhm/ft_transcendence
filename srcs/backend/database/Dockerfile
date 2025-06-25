FROM postgres

WORKDIR /db

# https://hub.docker.com/_/postgres : when postgre init db, execute every .sh/.sql in /docker-entrypoint-initdb.d/


COPY init-db/init-db.sh /docker-entrypoint-initdb.d/init-db.sh

RUN apt-get update && apt-get install -y gettext && rm -rf /var/lib/apt/lists/* && \
	chown -R postgres:postgres /db && \
	chown -R postgres:postgres /docker-entrypoint-initdb.d && \
		chmod +x /docker-entrypoint-initdb.d/init-db.sh


CMD ["postgres", "-c", "listen_addresses=*", "-c", "port=5432"]
