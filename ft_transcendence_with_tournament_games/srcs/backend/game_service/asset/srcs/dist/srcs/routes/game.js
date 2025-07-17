import { randomUUID } from 'crypto';
import { Game } from '../algo.js';
const sessions = new Map();
// Pending PvP game waiting for a second player
let pendingPvPGameId = null;
export default async function gamesRoutes(app) {
    // Create or join a game: solo AI or PvP matchmaking
    app.post('/game', async (request, reply) => {
        const { mode = 'ai', difficulty } = request.body;
        // Solo AI mode
        if (mode === 'ai') {
            const playerId = randomUUID();
            const gameId = randomUUID();
            const level = difficulty ?? 'medium';
            const game = new Game(playerId, 'AI', level);
            // Start AI simulation immediately
            const interval = setInterval(() => {
                const state = game.getState();
                if (!state.isGameOver)
                    game.step(1 / 60);
                else
                    clearInterval(interval);
            }, 1000 / 60);
            sessions.set(gameId, { game, interval });
            return { gameId, playerId };
        }
        // PvP mode: attempt to match with pending game
        if (pendingPvPGameId) {
            const gameId = pendingPvPGameId;
            const session = sessions.get(gameId);
            if (session) {
                // Second player joins
                const playerId = randomUUID();
                // Register second human player
                session.game.joinPlayer(playerId);
                // Start simulation now that both players are present
                const interval = setInterval(() => {
                    const state = session.game.getState();
                    if (!state.isGameOver)
                        session.game.step(1 / 60);
                    else
                        clearInterval(interval);
                }, 1000 / 60);
                session.interval = interval;
                pendingPvPGameId = null;
                return { gameId, playerId };
            }
            // Orphaned pending id, clear it
            pendingPvPGameId = null;
        }
        // No pending game: create new PvP game and wait for opponent
        const playerId = randomUUID();
        const gameId = randomUUID();
        const game = new Game(playerId, '__PENDING__', difficulty ?? 'medium');
        sessions.set(gameId, { game });
        pendingPvPGameId = gameId;
        return { gameId, playerId };
    });
    // Submit player input to an existing game
    app.post('/game/:id/input', async (request, reply) => {
        const { id } = request.params;
        const payload = request.body;
        const session = sessions.get(id);
        if (!session) {
            reply.code(404);
            return { error: 'Game not found' };
        }
        const { playerId, type, ts } = payload;
        // Apply input to the game
        session.game.handleInput(playerId, { type, ts });
        return { ok: true };
    });
    // Get current game state
    app.get('/game/:id/state', async (request, reply) => {
        const { id } = request.params;
        const session = sessions.get(id);
        if (!session) {
            reply.code(404);
            return { error: 'Game not found' };
        }
        const state = session.game.getState();
        return state;
    });
    // Join an existing PvP game: assign second player ID
    app.post('/game/:id/join', async (request, reply) => {
        const { id } = request.params;
        const session = sessions.get(id);
        if (!session) {
            reply.code(404);
            return { error: 'Game not found' };
        }
        // Assign new player ID to the second slot
        const newPlayerId = randomUUID();
        // Register second human player
        session.game.joinPlayer(newPlayerId);
        // Start PvP simulation now that both players have joined
        if (!session.interval) {
            const interval = setInterval(() => {
                const state = session.game.getState();
                if (!state.isGameOver) {
                    session.game.step(1 / 60);
                }
                else {
                    clearInterval(interval);
                }
            }, 1000 / 60);
            session.interval = interval;
        }
        return { gameId: id, playerId: newPlayerId };
    });
    // WebSocket endpoint for streaming game state updates
    app.get('/game/:id/ws', { websocket: true }, (connection, request) => {
        const { socket } = connection;
        const { id } = request.params;
        const session = sessions.get(id);
        if (!session) {
            // Close immediately if no session found
            socket.close();
            return;
        }
        // Send state periodically (every 100ms)
        const sendState = () => {
            try {
                const state = session.game.getState();
                socket.send(JSON.stringify(state));
                if (state.isGameOver) {
                    clearInterval(interval);
                    socket.close();
                }
            }
            catch (err) {
                clearInterval(interval);
                socket.close();
            }
        };
        const interval = setInterval(sendState, 100);
        // Clean up on socket close
        socket.on('close', () => {
            clearInterval(interval);
        });
    });
}
