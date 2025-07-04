import { FastifyInstance } from 'fastify'
import { randomUUID, createHmac } from 'crypto'
import { Game } from '../algo.js'
import type { ClientInput, GameState } from '../types.js'

// HMAC secret for per-game tokens (set via environment, fallback for dev)
const HMAC_SECRET = process.env.GAME_SECRET ?? 'dev-secret'
/**
 * Generate an auth token for the given gameId and playerId
 */
function genToken(gameId: string, playerId: string): string {
  return createHmac('sha256', HMAC_SECRET)
    .update(`${gameId}:${playerId}`)
    .digest('hex')
}
// In-memory store of active game sessions and their simulation loops
// Store game instance and optional simulation interval
interface GameSession {
  game: Game;
  interval?: NodeJS.Timer;
}
const sessions = new Map<string, GameSession>()
// No automatic PvP matchmaking; explicit create/join flows

export default async function gamesRoutes (app: FastifyInstance)
{
  // Create a new game: solo AI or PvP (first player only)
  app.post<{
    Body: { mode?: 'ai' | 'pvp'; difficulty?: 'easy' | 'medium' | 'hard'; isCustomOn?: boolean }
  }>('/game', async (request, reply) => {
    const { mode = 'ai', difficulty, isCustomOn = true } = request.body;
    // Solo AI mode
    if (mode === 'ai') {
      const playerId = randomUUID();
      const gameId = randomUUID();
      const level = difficulty ?? 'medium';
      const game = new Game(playerId, 'AI', level, isCustomOn);
      const interval = setInterval(() => {
        const state = game.getState();
        if (!state.isGameOver) game.step(1 / 60);
        else clearInterval(interval);
      }, 1000 / 60);
      sessions.set(gameId, { game, interval });
      return { gameId, playerId, token: genToken(gameId, playerId) };
    }
    // PvP mode: create a new pending game
    if (mode === 'pvp') {
      const playerId = randomUUID();
      const gameId = randomUUID();
      const level = difficulty ?? 'medium';
      const game = new Game(playerId, '__PENDING__', level, isCustomOn);
      sessions.set(gameId, { game });
      return { gameId, playerId, token: genToken(gameId, playerId) };
    }
    // Invalid mode
    reply.code(400);
    return { error: 'Invalid mode' };
  });

  // Submit player input to an existing game
  app.post('/game/:id/input', async (request, reply) =>
  {
    const { id } = request.params as { id: string }
  // Expect client to supply auth token generated at game start
  const payload = request.body as ClientInput & { playerId: string, token?: string }
    const session = sessions.get(id)
    if (!session)
    {
      reply.code(404)
      return { error: 'Game not found' }
    }
    const { playerId, type, ts, token } = payload
    // Verify HMAC token
    const expected = genToken(id, playerId)
    if (!token || token !== expected) {
      reply.code(403)
      return { error: 'Invalid token' }
    }
    // Apply input to the game
    session.game.handleInput(playerId, { type, ts })
    return { ok: true }
  })

  // Get current game state
  app.get('/game/:id/state', async (request, reply) =>
  {
    const { id } = request.params as { id: string }
    const session = sessions.get(id)
    if (!session)
    {
      reply.code(404)
      return { error: 'Game not found' }
    }
    const state: GameState = session.game.getState()
    return state
  })
  
  // Join an existing PvP game: assign second player ID
  app.post<{ Params: { id: string } }>('/game/:id/join', async (request, reply) => {
    const { id } = request.params;
    const session = sessions.get(id);
    if (!session) {
      reply.code(404);
      return { error: 'Game not found' };
    }
    // Ensure the second player slot is available
    const currentPlayers = session.game.getState().players;
    if (currentPlayers[1].id !== '__PENDING__') {
      reply.code(400);
      return { error: 'Game not available for join' };
    }
    // Assign new player ID to the second slot
    const newPlayerId = randomUUID();
    session.game.joinPlayer(newPlayerId);
    // Start PvP simulation now that both players have joined
    if (!session.interval) {
      const interval = setInterval(() => {
        const state: GameState = session.game.getState();
        if (!state.isGameOver) {
          session.game.step(1 / 60);
        } else {
          clearInterval(interval);
        }
      }, 1000 / 60);
      session.interval = interval;
    }
    // Issue token for the joining player
    return { gameId: id, playerId: newPlayerId, token: genToken(id, newPlayerId) };
  });
  
  // WebSocket endpoint for streaming game state updates
  app.get('/game/:id/ws', { websocket: true }, (connection, request) => {
    const { socket } = connection;
    const { id } = request.params as { id: string };
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
      } catch (err) {
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