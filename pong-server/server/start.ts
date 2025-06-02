import { buildApp } from './app';
import { WebSocketServer } from 'ws';
import crypto from 'crypto';
import type { WebSocket } from 'ws';
// Import Game logic and types from game module
import { Game, ClientInput } from '../game';

/**
 * Start HTTP + WebSocket servers and game loop.
 */
export async function start(): Promise<void> {
  const app = buildApp();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;

  // Game state
  const games = new Map<WebSocket, Game>();
  const socketId = new Map<WebSocket, string>();
  let waiting: WebSocket | null = null;

  // Attach message/close listeners to a socket in-game
  function attachInGameListeners(sock: WebSocket) {
    sock.on('message', (data: Buffer) => {
      const gameInstance = games.get(sock);
      const id = socketId.get(sock);
      if (!gameInstance || !id) return;

      let msg: ClientInput;
      try { msg = JSON.parse(data.toString()); } catch { return; }
      gameInstance.handleInput(id, msg);
    });
    sock.on('close', () => {
      const gameInstance = games.get(sock);
      if (gameInstance) {
        for (const [s, g] of games) if (g === gameInstance) games.delete(s);
      }
      socketId.delete(sock);
      if (waiting === sock) waiting = null;
    });
  }

  // Main game loop at 50 FPS
  setInterval(() => {
    const processed = new Set<Game>();
    for (const [sock, game] of games) {
      if (processed.has(game)) continue;
      processed.add(game);

      game.step(1 / 50);
      const state = game.getState();

      // Collect participants in this game
      const participants = Array.from(games.entries())
        .filter(([, g]) => g === game)
        .map(([s]) => s);

      for (const s of participants) {
        if (s.readyState !== (s as any).OPEN) continue;
        const type = state.isGameOver ? 'gameOver' : 'state';
        s.send(JSON.stringify({ type, payload: state }));
      }
      if (state.isGameOver) participants.forEach(s => games.delete(s));
    }
  }, 1000 / 50);

  // Start HTTP & WebSocket servers
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    const wss = new WebSocketServer({ server: app.server, path: '/ws' });
    wss.on('connection', socket => {
      socket.once('message', function handleFirstMessage(data: Buffer) {
        let firstMsg: { type: string };
        try { firstMsg = JSON.parse(data.toString()); } catch { return; }

        // SOLO
        if (firstMsg.type === 'startSolo') {
          const humanId = crypto.randomUUID();
          const aiId = 'AI';
          const game = new Game(humanId, aiId);
          games.set(socket, game);
          socketId.set(socket, humanId);
          socket.send(JSON.stringify({ type: 'start', side: 'left' }));
          attachInGameListeners(socket);
          return;
        }

        // MULTI
        if (!waiting) {
          waiting = socket;
          socket.send(JSON.stringify({ type: 'waiting' }));
        } else {
          const left = waiting;
          const right = socket;
          waiting = null;
          const leftId = crypto.randomUUID();
          const rightId = crypto.randomUUID();
          socketId.set(left, leftId);
          socketId.set(right, rightId);
          const game = new Game(leftId, rightId);
          games.set(left, game);
          games.set(right, game);
          left.send(JSON.stringify({ type: 'start', side: 'left' }));
          right.send(JSON.stringify({ type: 'start', side: 'right' }));
          attachInGameListeners(left);
          attachInGameListeners(right);
        }

        // Re-emit if included input
        try { socket.emit('message', data); } catch { }
      });
    });
    console.log(`Server Fastify & WebSocket started on http://localhost:${PORT}`);
  } catch (err: any) {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is in use. Free it or set a different PORT.`);
    } else {
      console.error(err);
    }
    process.exit(1);
  }
}
