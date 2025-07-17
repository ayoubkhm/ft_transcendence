import { FastifyInstance } from 'fastify'
import { randomUUID, createHmac } from 'crypto'
import { Client } from 'pg';
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
    Body: { mode?: 'ai' | 'pvp'; difficulty?: 'easy' | 'medium' | 'hard'; isCustomOn?: boolean, userId?: number | null }
  }>('/game', async (request, reply) => {
    const { mode = 'ai', difficulty, isCustomOn = true } = request.body;
    let userId = request.body.userId;
    if (!userId) {
        userId = 1; // FIXME: Hardcoded for debugging
    }
    const pgClient = new Client({ connectionString: process.env.DATABASE_URL });

    try {
      await pgClient.connect();

      if (mode === 'ai') {
        const sessionId = randomUUID();
        const playerId = randomUUID();
        const level = difficulty ?? 'medium';
        let sqlGameId: number | null = null;

        let res;
        if (userId) {
            res = await pgClient.query('SELECT * FROM new_game($1::INTEGER)', [userId]);
        } else {
            res = await pgClient.query('SELECT * FROM new_game()');
        }

        if (res.rows[0]?.success) {
          sqlGameId = res.rows[0].new_game_id;
        } else {
          console.error("Database error message:", res.rows[0]?.msg);
          reply.code(500).send({ error: 'Failed to create game in database' });
          return;
        }

        if (!sqlGameId) {
          reply.code(500).send({ error: 'Failed to create game in database' });
          return;
        }

        const game = new Game(playerId, 'AI', level, isCustomOn, sqlGameId);
        console.log('🎮 Game created with SQL ID:', sqlGameId);

        const interval = setInterval(async () => {
          try {
            const state = game.getState();
            if (!state.isGameOver) {
              await game.step(1 / 60, pgClient);
            } else {
              console.log('✅ Game finished');
              clearInterval(interval);
              await pgClient.end();
              sessions.delete(sessionId);
            }
          } catch (err) {
            console.error('Error in game step:', err);
            clearInterval(interval);
            await pgClient.end();
            sessions.delete(sessionId);
          }
        }, 1000 / 60);

        sessions.set(sessionId, { game, interval });
        return { gameId: sessionId, playerId, token: genToken(sessionId, playerId) };
      }

      if (mode === 'pvp') {
        const sessionId = randomUUID();
        const playerId = randomUUID();
        const level = difficulty ?? 'medium';
        let sqlGameId: number | null = null;

        if (!userId) {
            reply.code(401).send({ error: 'You must be logged in to create a PvP game.' });
            return;
        }

        const res = await pgClient.query('SELECT * FROM new_game($1::INTEGER, NULL, $2)', [userId, 'WAITING']);
        if (res.rows[0]?.success) {
          sqlGameId = res.rows[0].new_game_id;
        } else {
          console.error("Database error message:", res.rows[0]?.msg);
          reply.code(500).send({ error: 'Failed to create PvP game in database' });
          return;
        }

        if (!sqlGameId) {
          reply.code(500).send({ error: 'Failed to create PvP game in database' });
          return;
        }

        const game = new Game(playerId, '__PENDING__', level, isCustomOn, sqlGameId);
        sessions.set(sessionId, { game });
        return { gameId: sessionId, playerId, token: genToken(sessionId, playerId) };
      }

      reply.code(400).send({ error: 'Invalid mode' });
    } catch (err) {
      console.error('❌ Fatal error in /game route:', err);
      reply.code(500).send({ error: 'Server crashed in /game route' });
    }
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

  app.post<{ Params: { id: string } }>('/game/:id/join', async (request, reply) => {
    const { id } = request.params;
    const session = sessions.get(id);

    if (!session) {
      reply.code(404);
      return { error: 'Game not found' };
    }

    const currentPlayers = session.game.getState().players;
    if (currentPlayers[1].id !== '__PENDING__') {
      reply.code(400);
      return { error: 'Game not available for join' };
    }

    // 👤 Nouveau joueur
    const newPlayerId = randomUUID();
    session.game.joinPlayer(newPlayerId);

    // ▶️ Lancer la simulation si ce n’est pas déjà fait
    if (!session.interval) {
      const pgClient = new Client({ connectionString: process.env.DATABASE_URL });

      try {
        await pgClient.connect();
        console.log('✅ Connected to DB for PvP match loop');

        const interval = setInterval(async () => {
          try {
            const state = session.game.getState();
            if (!state.isGameOver) {
              await session.game.step(1 / 60, pgClient); // ✅ on passe pgClient
            } else {
              console.log('🏁 PvP game over, cleaning up');
              clearInterval(interval);
              await pgClient.end(); // ✅ on ferme proprement
              sessions.delete(id);
            }
          } catch (err) {
            console.error('❌ Error in PvP game loop:', err);
            clearInterval(interval);
            await pgClient.end();
          }
        }, 1000 / 60);

        session.interval = interval;
      } catch (err) {
        console.error('❌ Could not connect to PostgreSQL:', err);
        reply.code(500);
        return { error: 'Failed to start game loop' };
      }
    }
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