# Services backend : auth_service et game_service

Ce dépôt contient deux services backend développés en TypeScript avec Fastify :

- **auth_service** : gestion de l’authentification via OAuth2 (Google) et gestion de session par cookies.
- **game_service** : serveur de logique de jeu Pong, simulant une partie solo contre l’IA.

---

## Prérequis

- Node.js (>= 16)
- pnpm (pour `auth_service`) ou npm
- (Optionnel) Docker pour déployer `auth_service` en production

---

## 1) auth_service

### Installation

```bash
cd srcs/backend/auth_service
pnpm install         # installe les dépendances (ou npm install)
```

### Configuration

Copy `.env.example` to `.env` in the `srcs/backend/auth_service` folder and fill in your own values:
```dotenv
# OAuth2 credentials from Google Cloud Console
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
# The redirect URI you registered in Google (must match exactly)
CALLBACK_URL=http://localhost:3000/api/auth/google/callback
# Secret to sign session cookies
COOKIE_SECRET=some_random_string
```
Note: Place this `.env` file in the same directory as the `Dockerfile` (`srcs/backend/auth_service`) so that it is included in the Docker build.

### Lancement

- **Mode développement** :
  ```bash
  pnpm dev         # ou npm run dev
  ```
  Le service écoute sur le port `3000`.

- **Mode production (Docker)** :
  ```bash
  docker build -t auth_service .
  docker run -d --name auth_service -p 3000:3000 \
    -e ENV=prod auth_service
  ```
  Le container expose le port `3000`.

### Endpoints disponibles

- `GET  /api/auth/login/google`    : démarre le flux OAuth2 Google
- `GET  /api/auth/google/callback` : callback OAuth2, création de session et cookie
- `POST /api/auth/login`            : authentification par email/mot de passe (exemple)

---

## 2) game_service

### Installation

```bash
cd srcs/backend/game_service/asset
npm install         # ou pnpm install
```

### Configuration

Les variables d’environnement (facultatives) :
- `PORT` : port d’écoute (par défaut `3001`)
- `HOST` : adresse d’écoute (par défaut `0.0.0.0`)

### Lancement

- **Mode développement** :
  ```bash
  npm run dev       # lance en TS sans compilation
  ```

- **Mode production** :
  ```bash
  npm run build     # compile en JavaScript
  npm start         # démarre le service
  ```

Le service expose les endpoints principaux sous `/api` et un endpoint de métriques :

- `POST   /api/game`              : démarre une nouvelle partie solo, renvoie `{ gameId, playerId }`
- `POST   /api/game/:id/input`    : envoie une action du joueur (`move_up`, `move_down`, `stop`)
- `GET    /api/game/:id/state`    : récupère l’état courant du jeu
- `GET    /metrics`               : retourne des métriques JSON (nombre de requêtes, cookies, etc.)

---

## Structure du projet

```
srcs/
├─ backend/
│  ├─ auth_service/      # service d’authentification OAuth2
│  └─ game_service/      # service de jeu Pong solo contre IA
└─ frontend/             # code front-end (non documenté ici)
```

---

Pour toute question ou contribution, merci d’ouvrir une issue ou un pull request.