// ── pong-server/server.ts ─────────────────────────────────────────────────

import { WebSocketServer, WebSocket } from 'ws';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { Game } from './game';
import { ClientInput } from './types';
import crypto from 'crypto';

// Mapping pour associer chaque WebSocket à son Game et son playerId
const games   = new Map<WebSocket, Game>();
const socketId = new Map<WebSocket, string>();

// File d’attente du premier joueur
let waiting: WebSocket | null = null;

// 1. Serve static client files and handle WebSocket on port 8080
const staticRoot = path.resolve(__dirname, '../pong-client');
const server = http.createServer((req, res) =>
{
    // Determine requested path (default to index.html)
    const reqUrl = req.url === '/' ? '/index.html' : req.url!;
    const safePath = path.normalize(reqUrl).replace(/^([.]{2}[\/])+/, '');
    const filePath = path.join(staticRoot, safePath);
    fs.stat(filePath, (err, stats) =>
    {
        if (err || !stats.isFile())
        {
            res.writeHead(404);
            res.end('Not found');
            return;
        }
        const ext = path.extname(filePath).toLowerCase();
        const contentType = ext === '.html' ? 'text/html'
                      : ext === '.js'   ? 'application/javascript'
                      : ext === '.css'  ? 'text/css'
                      : 'application/octet-stream';
        res.writeHead(200,{ 'Content-Type': contentType });
        fs.createReadStream(filePath).pipe(res);
    });
});
// Attach WebSocket server to the HTTP server
const wss = new WebSocketServer({ server });
server.listen(8080, () =>
{
    console.log('Server listening on http://localhost:8080');
});

wss.on('connection', (ws: WebSocket) =>
{
    // Si pas de joueur en attente, on le met en attente
    if (!waiting)
    {
        waiting = ws;
        ws.send(JSON.stringify({ type: 'waiting' }));
        return;
    }

    // Sinon, on a un second joueur ➔ on forme la paire
    const left  = waiting;
    const right = ws;
    waiting = null;

    // Générer deux IDs uniques pour les deux sockets
    const leftId  = crypto.randomUUID();
    const rightId = crypto.randomUUID();
    socketId.set(left,  leftId);
    socketId.set(right, rightId);

    // Créer une nouvelle partie pour ce duo
    const game = new Game(leftId, rightId);
    games.set(left,  game);
    games.set(right, game);

    // Informer chacun de quel côté il est assigné
    left.send(JSON.stringify({ type: 'start', side: 'left' }));
    right.send(JSON.stringify({ type: 'start', side: 'right' }));

    // Pour chaque socket, on installe le listener "message" et "close"
    for (const sock of [left, right] as WebSocket[])
    {
        sock.on('message', (data: Buffer) =>
        {
            // Parser le message reçu
            let msg: ClientInput;
            try
            {
                msg = JSON.parse(data.toString());
            }
            catch
            {
                return;
            }

            const gameInstance = games.get(sock);
            const id          = socketId.get(sock);
            if (gameInstance && id)
            {
                // Transmettre l’input au moteur de jeu
                gameInstance.handleInput(id, msg);
            }
        });

        sock.on('close', () =>
        {
            // Lorsqu’un joueur se déconnecte, on supprime la partie si elle existe
            const gameInstance = games.get(sock);
            if (gameInstance)
            {
                // Supprimer les deux sockets de la même partie
                for (const [s, g] of games)
                {
                    if (g === gameInstance) games.delete(s);
                }
            }
            socketId.delete(sock);
        });
    }
});

// 2. Boucle principale (tick) : ~50 FPS → update + broadcast
setInterval(() =>
{
    // Pour chaque instance de jeu (chaque map dans `games`)
    const handled = new Set<Game>();
    for (const gameInstance of games.values())
    {
        if (handled.has(gameInstance))
            continue;
        handled.add(gameInstance);

        // Avancer la simulation
        gameInstance.step(1 / 50);

        const state = gameInstance.getState();
        // Rassembler les sockets participants à cette partie
        const participants = Array.from(games.entries())
        .filter(([_, g]) => g === gameInstance)
        .map(([sock]) => sock);

        for (const sock of participants)
        {
            if (sock.readyState === WebSocket.OPEN)
            {
                if (state.isGameOver)
                    sock.send(JSON.stringify({ type: 'gameOver', payload: state }));
                else
                    sock.send(JSON.stringify({ type: 'state', payload: state }));
            }
        }

        // Si la partie est terminée, on la supprime pour arrêter les updates
        if (state.isGameOver)
        {
            for (const sock of participants)
            {
                games.delete(sock);
            }
        }
    }
}, 1000 / 50);

// ──────────────────────────────────────────────────────────────────────────────
