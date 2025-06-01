# Pong Multijoueur en temps réel

Ce projet implémente un jeu Pong simple en temps réel avec un serveur WebSocket (TypeScript) et un client navigateur (HTML/JavaScript).

## Structure du dépôt

```
├── pong-client/       # Fichiers statiques du client
│   ├── index.html     # Page HTML principale
│   └── main.js        # Rendu du jeu et gestion des entrées côté client
└── pong-server/       # Serveur de jeu WebSocket (TypeScript)
    ├── game.ts        # Logique du jeu et gestion de l’état
    ├── server.ts      # Serveur HTTP + WebSocket
    ├── types.ts       # Types et constantes partagés
    └── package.json   # Dépendances du serveur
```

## Prérequis
- [Node.js](https://nodejs.org/) (v14+)
- npm (fourni avec Node.js)
- Optionnel : `ts-node` et `typescript` (installés via npm)

## Installation

1. Clonez ce dépôt :
   ```bash
   git clone <url-du-dépôt>
   cd <nom-du-dépôt>
   ```
2. Installez les dépendances du serveur :
   ```bash
   cd pong-server
   npm install
   ```

## Lancement du jeu

Depuis la racine du dépôt (ou à l’intérieur de `pong-server`) :

```bash
# Démarrer le serveur (sert HTTP et WebSocket sur le port 8080)
cd pong-server
npx ts-node server.ts
```

Vous devriez voir :
```
Server listening on http://localhost:8080
```

Ouvrez votre navigateur à l’adresse [http://localhost:8080](http://localhost:8080) pour charger le client.

### Contrôles
- **Flèche Haut** : monter la raquette
- **Flèche Bas** : descendre la raquette  
Appuyez et maintenez pour bouger ; relâchez pour arrêter.

## Règles du jeu
- Le premier à atteindre **11 points** avec un écart d’au moins **2 points** remporte la partie.  
- À la fin de la partie, les deux clients reçoivent un message `gameOver` et affichent le gagnant.

## Notes de développement
- **Logique du jeu** : `pong-server/game.ts` contient la physique, le comptage des points et la détection de la victoire.  
- **Types partagés** : `pong-server/types.ts` définit `GameState`, les constantes et le format des messages.  
- **Serveur** : `pong-server/server.ts` sert les fichiers statiques depuis `pong-client/` et gère les connexions WebSocket.  
- **Client** : `pong-client/main.js` dessine l’état du jeu et envoie les messages d’entrée.

Les contributions et améliorations sont les bienvenues ! N’hésitez pas à ouvrir des issues ou des pull requests.