PROJECT_NAME=ft_transcendence
DOCKER_COMPOSE_FILE=docker-compose.yml

all: up

real:
	@docker compose -p $(PROJECT_NAME) -f $(DOCKER_COMPOSE_FILE) up

real-build:
	@docker compose -p $(PROJECT_NAME) -f $(DOCKER_COMPOSE_FILE) up --build

redirect:
	@chmod +x ./srcs/tools/redirect-localhost.sh
	@./srcs/tools/redirect-localhost.sh

up-build:
	@docker compose -p $(PROJECT_NAME) -f $(DOCKER_COMPOSE_FILE) up --build -d

re: down up-build
rev: down-volume up-build

rreal: down real-build
rvreal: down-volume real-build

up:
	@docker compose -p $(PROJECT_NAME) -f $(DOCKER_COMPOSE_FILE) up -d

docker:
	sudo service docker start
	sudo dockerd &


down:
	@docker compose -p $(PROJECT_NAME) -f $(DOCKER_COMPOSE_FILE) down

down-volume:
	@docker compose -p $(PROJECT_NAME) -f $(DOCKER_COMPOSE_FILE) down -v

db-buildv:
	@docker compose -p $(PROJECT_NAME) -f $(DOCKER_COMPOSE_FILE) down -v
	@docker compose -p $(PROJECT_NAME) -f $(DOCKER_COMPOSE_FILE) build database

db-buildcv:
	@docker compose -p $(PROJECT_NAME) -f $(DOCKER_COMPOSE_FILE) down -v
	@docker compose -p $(PROJECT_NAME) -f $(DOCKER_COMPOSE_FILE) build --no-cache database


db-up:
	@docker compose -p $(PROJECT_NAME) -f $(DOCKER_COMPOSE_FILE) up -d database

db-super:
	@docker exec -e PGPASSWORD="$$DB_SUPERPASS" -it database \
    	sh -c 'psql -U "$$DB_SUPERUSER" -d "$$DB_NAME"'
db:
	@docker exec -it database \
    	sh -c 'psql -U "$$DB_USER" -d "$$DB_NAME"'

db-fullv: db-buildv db-up
db-full: db-build db-up

db-fullcv: db-buildcv db-up
db-fullc: db-buildc db-up

fclean:
	@echo "🔥 Nettoyage complet de Docker..."
	@docker system prune -a --volumes -f

logs :
	@docker compose -p $(PROJECT_NAME) -f $(DOCKER_COMPOSE_FILE) logs

user:
	@docker compose -p $(PROJECT_NAME) -f $(DOCKER_COMPOSE_FILE) up --build -d user_service
tournament:
	@docker compose -p $(PROJECT_NAME) -f $(DOCKER_COMPOSE_FILE) up --build -d tournament_service
frontend:
	@docker compose -p $(PROJECT_NAME) -f $(DOCKER_COMPOSE_FILE) up --build -d frontend
nginx:
	@docker compose -p $(PROJECT_NAME) -f $(DOCKER_COMPOSE_FILE) up --build -d nginx

remake-tf:
	@echo "Rebuilding tournament_service and frontend with logs..."
	@docker compose -p $(PROJECT_NAME) -f $(DOCKER_COMPOSE_FILE) up --build tournament_service frontend
