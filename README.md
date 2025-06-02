# Pong Multijoueur en temps réel

Un jeu Pong en temps réel sur navigateur, propulsé par un serveur TypeScript (Fastify + WebSocket).
Le client HTML/JavaScript communique avec le serveur pour synchroniser le jeu entre deux joueurs ou contre l’IA.

## Structure du dépôt

```
. (racine du projet)
├── pong-client/          # Client web statique (HTML/JS)
│   ├── index.html       # Page HTML principale
│   └── main.js          # Rendu Canvas et WebSocket client
└── pong-server/          # Serveur Node.js + TypeScript
    ├── server/           # Configuration et démarrage du serveur
    │   ├── app.ts        # Construction de l’app Fastify (logging, statics)
    │   ├── start.ts      # Lancement HTTP + WebSocket + boucle de jeu
    │   └── server.ts     # Entrypoint minimal qui appelle start()
    ├── game/             # Moteur de jeu Pong
    │   ├── game.ts       # Classe Game: physique, scores, détection de fin
    │   ├── types.ts      # Constantes & types partagés (GameState, Paddle…)
    │   ├── ai/           # IA solo pour le mode solo
    │   │   └── index.ts  # Fonction aiPaddleMove
    │   └── index.ts      # Réexport des modules Game, types et ai
    ├── package.json      # Dépendances & scripts serveur
    ├── tsconfig.json     # Configuration TypeScript
    └── server.ts         # Lance le serveur (via ts-node)
```

## Prérequis
- Node.js v14+ (version LTS recommandée)
- npm (inclus avec Node.js)

## Installation
1. Clonez le projet et installez les dépendances :
   ```bash
   git clone git@github.com:ayoubkhm/ft_transcendence.git
   cd ft_transcendence
   # Client
   cd pong-client && npm install && cd ..
   # Serveur
   cd pong-server && npm install
   ```

## Démarrage du serveur
Placez-vous dans le dossier `pong-server` et lancez :
```bash
cd pong-server
# Démarre HTTP & WebSocket sur le port 8080 par défaut
npx ts-node server.ts

# Pour changer de port (ex. 4000) :
PORT=4000 npx ts-node server.ts
```
Exemple de sortie :
```
Server Fastify & WebSocket started on http://localhost:8080
```
Le client est ensuite accessible à :
```
http://localhost:8080
```

### Contrôles et règles
- **Contrôles** : Flèche Haut / Flèche Bas (maintenir pour bouger, relâcher pour stopper)
- **Modes** :
  - SOLO : affrontez l’IA côté droit
  - MULTI : jouez en duel, chaque joueur est apparié automatiquement
- **Victoire** : premier à 11 points (écart minimal de 2)

## Notes de développement
- **Moteur de jeu** : `pong-server/game/game.ts` (classe Game : physique, scores, détection de fin)
- **Types partagés** : `pong-server/game/types.ts` (constantes, interfaces `GameState`, `Paddle`, `Ball`, etc.)
- **IA solo** : `pong-server/game/ai/index.ts` (fonction `aiPaddleMove`)
- **Serveur** :  
  - `pong-server/server/app.ts` (configuration Fastify : logging, statics)  
  - `pong-server/server/start.ts` (gestion HTTP, WebSocket, boucle de jeu)  
  - `pong-server/server.ts` (entrypoint minimal via ts-node)  
- **Client** :  
  - `pong-client/index.html` (structure HTML)  
  - `pong-client/main.js` (rendu Canvas, WebSocket client)

C'est qu'un début, mais avec, on peut dire qu'on a déjà commncé à bosser sur 3 modules.