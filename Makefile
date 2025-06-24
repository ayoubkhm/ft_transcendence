PROJECT_NAME = ft_transcendence
DOCKER_COMPOSE_FILE = srcs/docker-compose-dev.yml

all: up

#─────────────────────────
# Utilitaires
#─────────────────────────
redirect:
	chmod +x ./srcs/tools/redirect-localhost.sh
	@echo "🔄 Redirection de localhost..."
	@./srcs/tools/redirect-localhost.sh

docker-start: redirect
	@echo "Starting Docker Desktop (if not already running)..."
	-@docker info >/dev/null 2>&1 || open -a Docker || \
		echo "Please start Docker Desktop manually if this fails."
	@until docker info >/dev/null 2>&1; do \
		echo "Waiting for Docker daemon to be responsive..."; \
		sleep 2; \
	done

#─────────────────────────
# Cibles principales
#─────────────────────────
up-build:
	@docker compose -p $(PROJECT_NAME) -f $(DOCKER_COMPOSE_FILE) up --build -d

up: docker-start
	@docker compose -p $(PROJECT_NAME) -f $(DOCKER_COMPOSE_FILE) up -d

re: redirect docker-start down nginx-rebuild up-build   # ← nginx vraiment rebuild

rev: redirect docker-start down-volume up-build

#─────────────────────────
# Arrêt / Nettoyage
#─────────────────────────
down:
	@docker compose -p $(PROJECT_NAME) -f $(DOCKER_COMPOSE_FILE) down

down-volume:
	@docker compose -p $(PROJECT_NAME) -f $(DOCKER_COMPOSE_FILE) down -v

fclean:
	@echo "🔥 Nettoyage complet de Docker..."
	@docker system prune -a --volumes -f

#─────────────────────────
# Base de données
#─────────────────────────
db-buildv: docker-start down-volume
	@docker compose -p $(PROJECT_NAME) -f $(DOCKER_COMPOSE_FILE) build --no-cache database

db-build: docker-start down
	@docker compose -p $(PROJECT_NAME) -f $(DOCKER_COMPOSE_FILE) build --no-cache database

db-up: docker-start
	@docker compose -p $(PROJECT_NAME) -f $(DOCKER_COMPOSE_FILE) up -d database

db:
	@docker exec -it database_service \
		sh -c 'psql -U "$$DB_USER" -d "$$DB_NAME"'

db-full: docker-start db-buildv db-up

#─────────────────────────
# Nginx — rebuild forcé sans cache
#─────────────────────────
nginx-rebuild:
	@docker compose -p $(PROJECT_NAME) -f $(DOCKER_COMPOSE_FILE) \
		build --no-cache nginx
	@docker compose -p $(PROJECT_NAME) -f $(DOCKER_COMPOSE_FILE) \
		up -d --force-recreate nginx

#─────────────────────────
# Logs
#─────────────────────────
logs:
	@docker compose -p $(PROJECT_NAME) -f $(DOCKER_COMPOSE_FILE) logs
