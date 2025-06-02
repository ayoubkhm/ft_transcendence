import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { resolve } from 'path';
import crypto from 'crypto';
import type { WebSocket } from 'ws';
import { WebSocketServer } from 'ws';


import { Game } from './game';
import { ClientInput } from './types';

// Enable built-in logging so startup errors are visible
const app = Fastify({ logger: true });
// Allow overriding port via environment variable, default to 8080
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;

// 1. Register WebSocket plugin before any routes/files so it can intercept upgrades

// 2. Serve static files (../pong-client)
const staticRoot = resolve(__dirname, '../pong-client');
app.register(fastifyStatic, {
  root: staticRoot,
  prefix: '/', // static files are served from the web root
});

// 3. Structures pour gérer les parties
const games    = new Map<WebSocket, Game>();
const socketId = new Map<WebSocket, string>();
let waiting: WebSocket | null = null;

// 4. WebSocket server for game events
//    directly attach to Fastify's HTTP server
//    handle upgrade on '/ws'


/** Attribue les listeners “in-game” (message, close) à un socket déjà en partie */
function attachInGameListeners(sock: WebSocket) {
  sock.on('message', (data: Buffer) => {
    const gameInstance = games.get(sock);
    const id           = socketId.get(sock);
    if (!gameInstance || !id) return;

    let msg: ClientInput;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return;
    }

    gameInstance.handleInput(id, msg);
  });

  sock.on('close', () => {
    const gameInstance = games.get(sock);
    if (gameInstance) {
      for (const [s, g] of games) {
        if (g === gameInstance) {
          games.delete(s);
        }
      }
    }
    socketId.delete(sock);
    if (waiting === sock) {
      waiting = null;
    }
  });
}

// 5. Boucle de jeu globale (50 FPS)
setInterval(() => {
  const processed = new Set<Game>();

  for (const [sock, game] of games) {
    if (processed.has(game)) continue;
    processed.add(game);

    game.step(1 / 50);
    const state = game.getState();

    // Récupère tous les sockets participant à cette partie
    const participants = Array.from(games.entries())
      .filter(([ , g]) => g === game)
      .map(([s]) => s);

    for (const s of participants) {
      if (s.readyState !== (s as any).OPEN) continue;
      const type = state.isGameOver ? 'gameOver' : 'state';
      s.send(JSON.stringify({ type, payload: state }));
    }

    if (state.isGameOver) {
      participants.forEach(s => games.delete(s));
    }
  }
}, 1000 / 50);

// 6. Démarrage du serveur
const start = async () => {
  try {
    // start HTTP server
    await app.listen({ port: PORT, host: '0.0.0.0' });
    // attach WebSocket server on the same HTTP server
    const wss = new WebSocketServer({ server: app.server, path: '/ws' });
    wss.on('connection', (socket: WebSocket) => {
      // First incoming message decides solo vs multi
      socket.once('message', function handleFirstMessage(data: Buffer) {
        let firstMsg: { type: string };
        try {
          firstMsg = JSON.parse(data.toString());
        } catch {
          return;
        }

        // SOLO MODE
        if (firstMsg.type === 'startSolo') {
          const humanId = crypto.randomUUID();
          const aiId    = 'AI';

          const game = new Game(humanId, aiId);
          games.set(socket, game);
          socketId.set(socket, humanId);

          socket.send(JSON.stringify({ type: 'start', side: 'left' }));
          attachInGameListeners(socket);
          return;
        }

        // MULTI MODE
        if (!waiting) {
          waiting = socket;
          socket.send(JSON.stringify({ type: 'waiting' }));
        } else {
          const left  = waiting;
          const right = socket;
          waiting = null;

          const leftId  = crypto.randomUUID();
          const rightId = crypto.randomUUID();

          socketId.set(left,  leftId);
          socketId.set(right, rightId);

          const game = new Game(leftId, rightId);
          games.set(left,  game);
          games.set(right, game);

          left.send (JSON.stringify({ type: 'start', side: 'left'  }));
          right.send(JSON.stringify({ type: 'start', side: 'right' }));

          attachInGameListeners(left);
          attachInGameListeners(right);
        }

        // If the first message included an input, re-emit it
        try {
          socket.emit('message', data);
        } catch {
          // ignore
        }
      });
    });
    console.log(`Server Fastify & WebSocket démarré sur http://localhost:${PORT}`);
  } catch (err) {
    // Handle startup errors (e.g. port already in use)
    if ((err as any).code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. ` +
        `Please free it or set a different PORT env var.`);
    } else {
      console.error(err);
    }
    process.exit(1);
  }
};

start();
