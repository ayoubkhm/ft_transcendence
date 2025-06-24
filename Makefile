PROJECT_NAME=ft_transcendence
DOCKER_COMPOSE_FILE=srcs/docker-compose-dev.yml

all: up

up: docker-start
	@docker compose -p $(PROJECT_NAME) -f $(DOCKER_COMPOSE_FILE) up -d

docker-start:
	sudo service docker start

db-buildv: docker-start
	@docker-compose -p $(PROJECT_NAME) -f $(DOCKER_COMPOSE_FILE) down -v
	@docker-compose -p $(PROJECT_NAME) -f $(DOCKER_COMPOSE_FILE) build --no-cache database

db-build: docker-start
	@docker-compose -p $(PROJECT_NAME) -f $(DOCKER_COMPOSE_FILE) down
	@docker-compose -p $(PROJECT_NAME) -f $(DOCKER_COMPOSE_FILE) build --no-cache database

db-up: docker-start
	@docker-compose -p $(PROJECT_NAME) -f $(DOCKER_COMPOSE_FILE) up -d database

db:
	@docker exec -it database_service \
		sh -c 'psql -U "$$DB_USER" -d "$$DB_NAME"'

db-full: docker-start db-buildv db-up

fclean:
	@echo "🔥 Nettoyage complet de Docker..."
	@docker system prune -a --volumes -f

logs :
	@docker-compose -p $(PROJECT_NAME) -f $(DOCKER_COMPOSE_FILE) logs 