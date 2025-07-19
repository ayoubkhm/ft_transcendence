import { FastifyInstance } from 'fastify'
import { randomUUID, createHmac } from 'crypto'
import { Game } from '../algo.js'
import type { ClientInput, GameState } from '../types.js'
import { WebSocket } from 'ws'
type IntervalRef = ReturnType<typeof setInterval>;

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
interface GameSession {
  game: Game;
  interval?: IntervalRef;
  clients: Set<WebSocket>;
}

const sessions = new Map<string, GameSession>()

// --- WebSocket Connection Management & Broadcasting ---
function joinGame(gameId: string, client: WebSocket) {
  const session = sessions.get(gameId);
  if (session) {
    session.clients.add(client);
    console.log(`[WS] Client joined game ${gameId}. Total clients: ${session.clients.size}`);
  }
}

function leaveGame(gameId: string, client: WebSocket) {
  const session = sessions.get(gameId);
  if (session) {
    session.clients.delete(client);
    console.log(`[WS] Client left game ${gameId}. Total clients: ${session.clients.size}`);
  }
}

function broadcastGameState(gameId: string) {
  const session = sessions.get(gameId);
  if (!session) return;

  const state = session.game.getState();
  const message = JSON.stringify({ type: 'game_state_update', data: state });

  session.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });

  if (state.isGameOver) {
    console.log(`[Game] Game ${gameId} is over. Stopping broadcast.`);
    clearInterval(session.interval);
    // Clean up the session after a short delay to ensure final state is sent
    setTimeout(() => {
      console.log(`[Game] Cleaning up session for game ${gameId}`);
      sessions.delete(gameId);
    }, 5000); // 5-second cleanup delay
  }
}


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
    
    const pgClient = await app.pg.connect();

    try {
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
        const gameIdString = sqlGameId.toString();

        const interval = setInterval(async () => {
          const pgClient = await app.pg.connect();
          try {
            await game.step(1 / 60, pgClient);
            broadcastGameState(gameIdString);
          } finally {
            pgClient.release();
          }
        }, 1000 / 60);

        sessions.set(gameIdString, { game, interval, clients: new Set() });
        return { gameId: gameIdString, playerId: username, token: genToken(gameIdString, username) };
      }

      // PvP mode logic
      if (mode === 'pvp') {
        const level = difficulty ?? 'medium';
        let sqlGameId: number | null = null;

        const res = await pgClient.query('SELECT * FROM new_game($1::INTEGER, NULL, $2)', [userId, 'WAITING']);
        if (res.rows[0]?.success) {
          sqlGameId = res.rows[0].new_game_id;
        } else {
          reply.code(500).send({ error: 'Failed to create PvP game in database' });
          return;
        }

        if (!sqlGameId) {
          reply.code(500).send({ error: 'Failed to create PvP game in database' });
          return;
        }

        const game = new Game(username, '__PENDING__', level, isCustomOn, sqlGameId);
        const gameIdString = sqlGameId.toString();
        sessions.set(gameIdString, { game, clients: new Set() });
        return { gameId: gameIdString, playerId: username, token: genToken(gameIdString, username) };
      }

      reply.code(400).send({ error: 'Invalid mode' });
    } catch (err) {
      console.error('❌ Fatal error in /game route:', err);
      reply.code(500).send({ error: 'Server crashed in /game route' });
    } finally {
      pgClient.release();
    }
  });

  // WebSocket endpoint
  app.get('/game/:id/ws', { websocket: true }, (connection, request) => {
    const { socket } = connection;
    const { id } = request.params as { id: string };
    
    joinGame(id, socket);

    socket.on('message', async (rawMessage) => {
      try {
        const message = JSON.parse(rawMessage.toString());
        const session = sessions.get(id);
        if (!session) return;

        switch (message.type) {
          case 'game_input': {
            const { playerId, type, ts, token } = message.payload;
            const expectedToken = genToken(id, playerId);
            if (!token || token !== expectedToken) return;
            session.game.handleInput(playerId, { type, ts });
            break;
          }
          case 'join_pvp_game': {
            const { username } = message.payload;
            if (!username || session.game.getState().players[1].id !== '__PENDING__') {
              socket.send(JSON.stringify({ type: 'error', message: 'Game not available for join' }));
              return;
            }
            
            session.game.joinPlayer(username);
            const token = genToken(id, username);
            socket.send(JSON.stringify({ type: 'join_success', data: { token, playerId: username } }));

            if (!session.interval) {
              session.interval = setInterval(async () => {
                const pgClient = await app.pg.connect();
                try {
                  await session.game.step(1 / 60, pgClient);
                  broadcastGameState(id);
                } finally {
                  pgClient.release();
                }
              }, 1000 / 60);
            }
            break;
          }
        }
      } catch (err) {
        console.error('[WS] Error processing message:', err);
      }
    });

    socket.on('close', () => {
      leaveGame(id, socket);
    });
  });
}
