# ft_transcendence

A full-stack web application featuring a real-time multiplayer Pong game, user authentication, and a tournament system. This project is built with a microservices architecture and is designed to be run with Docker.

## ✨ Features

- **Real-time Multiplayer Pong:** Play Pong against other users.
- **User Authentication:** Secure login using OAuth2 with Google.
- **Social Features:** Friends list.
- **Tournaments:** Create and participate in Pong tournaments.
- **User Profiles:** View user stats and match history.

## 🛠️ Technology Stack

- **Frontend:** TypeScript, Vite, Tailwind CSS
- **Backend:** Node.js, TypeScript, Fastify
- **Database:** PostgreSQL
- **Containerization:** Docker, Docker Compose
- **Reverse Proxy:** Nginx
- **Security:** Vault for secrets management

## 🚀 Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Installation & Running

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/ft_transcendence.git
    cd ft_transcendence
    ```

2.  **Create the environment file:**
    Create a file named `.env` in the root of the project and add the following variables. You will need to provide your own credentials for Google OAuth and the database.

    ```env
    # Google OAuth Credentials
    GOOGLE_CLIENT_ID=your_google_client_id
    GOOGLE_CLIENT_SECRET=your_google_client_secret
    CALLBACK_URL=https://localhost:4443/api/auth/google/callback

    # PostgreSQL Database Credentials
    DB_SUPERUSER=superuser
    DB_SUPERPASS=superpassword
    DB_USER=user
    DB_PASS=password
    DB_NAME=transcendence
    DB_PORT=5432

    # Secrets for JWT and Cookies
    COOKIE_SECRET=yourcookiesecret
    JWT_SECRET=yourjwtsecret
    API_CREDENTIAL=yourapicredential
    ```

3.  **Build and run the application:**
    Use Docker Compose to build the images and start all the services.
    ```bash
    docker compose up --build
    ```
    The `--build` flag is only necessary the first time or when you make changes to the Dockerfiles.

4.  **Access the application:**
    Once all the services are running, you can access the application in your browser at:
    [**https://localhost:4443**](https://localhost:4443)

### Useful Docker Commands

- **Stop all services:**
  ```bash
  docker compose down
  ```
- **View logs for a specific service:**
  ```bash
  docker compose logs -f <service_name>
  ```
  (e.g., `docker compose logs -f frontend`)
- **Access a running container's shell:**
  ```bash
  docker exec -it <service_name> /bin/sh
  ```

## 🏛️ Architecture

This project follows a microservices architecture. Each service is a separate container managed by Docker Compose.

- **`nginx`**: The reverse proxy that routes traffic to the appropriate backend service or serves the frontend application. This is the main entry point for all incoming traffic.
- **`frontend`**: The user interface built with Vite and TypeScript.
- **`database`**: The PostgreSQL database that stores all application data.
- **`auth_service`**: Handles user authentication, registration, and session management.
- **`user_service`**: Manages user profiles, friends, and other user-related data.
- **`game_service`**: Contains the core logic for the Pong game.
- **`tournament_service`**: Manages the creation and flow of tournaments.
- **`vault_service`**: A service for securely storing and managing secrets like API keys and database credentials.

All services communicate with each other over a private Docker network.