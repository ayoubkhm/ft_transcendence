PROJECT_NAME=ft_transcendence
DOCKER_COMPOSE_FILE=srcs/docker-compose-dev.yml

all: up

redirect:
	chmod +x ./srcs/tools/redirect-localhost.sh
	@echo "🔄 Redirection de localhost..."
	@./srcs/tools/redirect-localhost.sh

up-build:
	@docker compose -p $(PROJECT_NAME) -f $(DOCKER_COMPOSE_FILE) up --build -d

re: redirect docker-start down up-build

rev: redirect docker-start down-volume up-build


up: docker-start
	@docker compose -p $(PROJECT_NAME) -f $(DOCKER_COMPOSE_FILE) up -d

docker-start: redirect docker-start
	sudo service docker start

down:
	@docker compose -p $(PROJECT_NAME) -f $(DOCKER_COMPOSE_FILE) down

down-volume:
	@docker compose -p $(PROJECT_NAME) -f $(DOCKER_COMPOSE_FILE) down -v

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

fclean:
	@echo "🔥 Nettoyage complet de Docker..."
	@docker system prune -a --volumes -f

logs :
	@docker compose -p $(PROJECT_NAME) -f $(DOCKER_COMPOSE_FILE) logs
