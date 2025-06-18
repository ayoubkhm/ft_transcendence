import { randomUUID } from 'crypto';
import { Game } from '../game.js';
const sessions = new Map();
export default async function (app) {
    // Create a new solo game (player vs AI)
    app.post('/game', async (request, reply) => {
        const playerId = randomUUID();
        const gameId = randomUUID();
        const game = new Game(playerId, 'AI');
        // Start game simulation at ~60fps
        const interval = setInterval(() => {
            const state = game.getState();
            if (!state.isGameOver) {
                game.step(1 / 60);
            }
            else {
                clearInterval(interval);
            }
        }, 1000 / 60);
        sessions.set(gameId, { game, interval });
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
}
