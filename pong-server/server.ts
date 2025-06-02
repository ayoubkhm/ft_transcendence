// ── pong-server/server.ts ─────────────────────────────────────────────────
import { WebSocketServer, WebSocket } from 'ws';
import * as http   from 'http';
import * as fs     from 'fs';
import * as path   from 'path';
import crypto      from 'crypto';

import { Game }         from './game';
import { ClientInput }  from './types';

// ──────────────────────────────────────────────────────────────────────────
// 1. Static files + HTTP server
// ──────────────────────────────────────────────────────────────────────────
const staticRoot = path.resolve(__dirname, '../pong-client');
const server = http.createServer((req, res) => {
  const reqUrl   = req.url === '/' ? '/index.html' : req.url!;
  const safePath = path.normalize(reqUrl).replace(/^([.]{2}[\\/])+/, '');
  const filePath = path.join(staticRoot, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType =
        ext === '.html' ? 'text/html'
      : ext === '.js'   ? 'application/javascript'
      : ext === '.css'  ? 'text/css'
      : 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(8080, () => console.log('Server on http://localhost:8080'));

// ──────────────────────────────────────────────────────────────────────────
// 2. WebSocket handling
// ──────────────────────────────────────────────────────────────────────────
const wss       = new WebSocketServer({ server });
const games     = new Map<WebSocket, Game>();   // socket → Game
const socketId  = new Map<WebSocket, string>(); // socket → playerId

let waiting: WebSocket | null = null;           // file d’attente multi

wss.on('connection', (ws) => {
  //
  // 2-A. On attend de savoir si le client veut « solo » ou « multi ».
  //
  ws.once('message', (data) => {
    let firstMsg: { type: string };
    try {
      firstMsg = JSON.parse(data.toString());
    } catch { return; }

    // → MODE SOLO
    if (firstMsg.type === 'startSolo') {
      const humanId = crypto.randomUUID();
      const aiId    = 'AI'; // ID spécial pour l’IA

      const game = new Game(humanId, aiId);     // bot à droite
      games.set(ws, game);
      socketId.set(ws, humanId);

      ws.send(JSON.stringify({ type: 'start', side: 'left' })); // humain à gauche
      attachInGameListeners(ws);
      return; // fini, pas de file d’attente
    }

    //
    // → MODE MULTI
    //
    // Le message n’est pas "startSolo" : on le traite plus tard comme input,
    // mais d’abord on gère la mise en attente / association.
    //
    if (!waiting) {
      waiting = ws;
      ws.send(JSON.stringify({ type: 'waiting' }));
    } else {
      const left  = waiting;
      const right = ws;
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

    // Le premier message « non-solo » (s’il y en a un) peut être un input :
    // on le repasse directement au listener « message » qu’on va fixer 👇.
    ws.emit('message', data);
  });
});

/** Pose les listeners "message" et "close" pour un joueur déjà dans une partie */
function attachInGameListeners(sock: WebSocket) {
  sock.on('message', (data: Buffer) => {
    const gameInstance = games.get(sock);
    const id           = socketId.get(sock);
    if (!gameInstance || !id) return;

    // Les premiers messages étaient déjà gérés ; ici on ne gère que les inputs.
    let msg: ClientInput;
    try { msg = JSON.parse(data.toString()); }
    catch { return; }

    gameInstance.handleInput(id, msg);
  });

  sock.on('close', () => {
    const gameInstance = games.get(sock);
    if (gameInstance) {
      for (const [s, g] of games)
        if (g === gameInstance) games.delete(s);
    }
    socketId.delete(sock);
    if (waiting === sock) waiting = null;
  });
}

// ──────────────────────────────────────────────────────────────────────────
// 3. Boucle de jeu globale (50 FPS)
// ──────────────────────────────────────────────────────────────────────────
setInterval(() => {
  const already = new Set<Game>();

  for (const [sock, game] of games) {
    if (already.has(game)) continue;
    already.add(game);

    game.step(1 / 50);               // avance la simulation
    const state = game.getState();

    // sockets concernés par **cette** partie
    const participants = Array.from(games.entries())
      .filter(([ , g]) => g === game)
      .map(([s]) => s);

    for (const s of participants) {
      if (s.readyState !== WebSocket.OPEN) continue;
      const type = state.isGameOver ? 'gameOver' : 'state';
      s.send(JSON.stringify({ type, payload: state }));
    }

    if (state.isGameOver)
      participants.forEach(s => games.delete(s));
  }
}, 1000 / 50);
