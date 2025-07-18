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
    Body: { mode?: 'ai' | 'pvp'; difficulty?: 'easy' | 'medium' | 'hard'; isCustomOn?: boolean, username?: string }
  }>('/game', async (request, reply) => {
    const { mode = 'ai', difficulty, isCustomOn = true, username } = request.body;

    if (!username) {
        return reply.code(401).send({ error: 'You must be logged in to play.' });
    }
    const pgClient = new Client({ connectionString: process.env.DATABASE_URL });

    try {
      await pgClient.connect();
      
      const userRes = await pgClient.query('SELECT id FROM users WHERE name = $1', [username]);
      if (userRes.rows.length === 0) {
          return reply.code(404).send({ error: 'User not found' });
      }
      const userId = userRes.rows[0].id;

      if (mode === 'ai') {
        const level = difficulty ?? 'medium';
        let sqlGameId: number | null = null;

        const res = await pgClient.query('SELECT * FROM new_game($1::INTEGER)', [userId]);

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

        const game = new Game(username, 'AI', level, isCustomOn, sqlGameId);
        console.log('🎮 Game created with SQL ID:', sqlGameId);
        const gameIdString = sqlGameId.toString();

        const interval = setInterval(async () => {
          try {
            const state = game.getState();
            if (!state.isGameOver) {
              await game.step(1 / 60, pgClient);
            } else {
              console.log('✅ Game finished, starting 30s cleanup timer.');
              clearInterval(interval);
              await pgClient.end();
              // Keep session for 30s for clients to fetch final state
              setTimeout(() => {
                console.log(`Cleaning up AI game session ${gameIdString}`);
                sessions.delete(gameIdString);
              }, 30000);
            }
          } catch (err) {
            console.error('Error in game step:', err);
            clearInterval(interval);
            await pgClient.end();
            sessions.delete(gameIdString); // Clean up immediately on error
          }
        }, 1000 / 60);

        sessions.set(gameIdString, { game, interval });
        return { gameId: gameIdString, playerId: username, token: genToken(gameIdString, username) };
      }

      if (mode === 'pvp') {
        const level = difficulty ?? 'medium';
        let sqlGameId: number | null = null;

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

        const game = new Game(username, '__PENDING__', level, isCustomOn, sqlGameId);
        const gameIdString = sqlGameId.toString();
        sessions.set(gameIdString, { game });
        return { gameId: gameIdString, playerId: username, token: genToken(gameIdString, username) };
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

  app.post<{ Params: { id: string }, Body: { username: string } }>('/game/:id/join', async (request, reply) => {
    const { id } = request.params;
    const { username } = request.body;
    const session = sessions.get(id);

    if (!session) {
      reply.code(404);
      return { error: 'Game not found' };
    }

    if (!username) {
        reply.code(401).send({ error: 'You must be logged in to join a PvP game.' });
        return;
    }

    const currentPlayers = session.game.getState().players;
    if (currentPlayers[1].id !== '__PENDING__') {
      reply.code(400);
      return { error: 'Game not available for join' };
    }

    // 👤 Nouveau joueur
    session.game.joinPlayer(username);

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
              console.log('🏁 PvP game over, starting 30s cleanup timer.');
              clearInterval(interval);
              await pgClient.end(); // ✅ on ferme proprement
              // Keep session for 30s for clients to fetch final state
              setTimeout(() => {
                console.log(`Cleaning up PvP game session ${id}`);
                sessions.delete(id);
              }, 30000);
            }
          } catch (err) {
            console.error('❌ Error in PvP game loop:', err);
            clearInterval(interval);
            await pgClient.end();
            sessions.delete(id); // Clean up immediately on error
          }
        }, 1000 / 60);

        session.interval = interval;
      } catch (err) {
        console.error('❌ Could not connect to PostgreSQL:', err);
        reply.code(500);
        return { error: 'Failed to start game loop' };
      }
    }
    return { gameId: id, playerId: username, token: genToken(id, username) };
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