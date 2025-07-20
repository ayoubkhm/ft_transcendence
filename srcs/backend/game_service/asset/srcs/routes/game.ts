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
  forfeitTimer?: NodeJS.Timeout;
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

        const game = new Game(username, 'AI', userId, null, 'IA', level, isCustomOn, sqlGameId);
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

        const game = new Game(username, '__PENDING__', userId, null, 'VS', level, isCustomOn, sqlGameId);
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
    
    console.log(`[WS] New client connection established for game ${id}`);
    joinGame(id, socket);

    socket.on('message', async (rawMessage) => {
      console.log(`[WS] Received message for game ${id}:`, rawMessage.toString());
      try {
        const message = JSON.parse(rawMessage.toString());
        let session = sessions.get(id);

        if (!session) {
          console.log(`[WS] No session for game ${id}, attempting to reload from DB.`);
          const pgClient = await app.pg.connect();
          try {
            const gameIdInt = parseInt(id, 10);
            if (isNaN(gameIdInt)) {
              socket.send(JSON.stringify({ type: 'error', message: 'Invalid game ID.' }));
              return;
            }

            const gameRes = await pgClient.query(
              "SELECT * FROM games WHERE id = $1 AND (state = 'WAITING' OR type = 'TOURNAMENT')",
              [gameIdInt]
            );

            if (gameRes.rows.length > 0) {
              const dbGame = gameRes.rows[0];
              const p1Res = await pgClient.query('SELECT name FROM users WHERE id = $1', [dbGame.p1_id]);
              const p1Name = p1Res.rows[0]?.name;

              if (p1Name) {
                const game = new Game(p1Name, '__PENDING__', dbGame.p1_id, null, dbGame.type, 'medium', true, gameIdInt);
                const newSession = { game, clients: new Set() };
                sessions.set(id, newSession);
                session = newSession;
                console.log(`[WS] Session for game ${id} reloaded from DB.`);
              }
            }
          } finally {
            pgClient.release();
          }
        }

        if (session && !session.clients.has(socket)) {
            session.clients.add(socket);
            console.log(`[WS] Client belatedly joined game ${id}. Total clients: ${session.clients.size}`);
        }
        
        if (!session) {
          console.error(`[WS] No session found for game ${id}`);
          socket.send(JSON.stringify({ type: 'error', message: 'Game session not found or already started.' }));
          return;
        }

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
            if (!username) {
              socket.send(JSON.stringify({ type: 'error', message: 'Username is required to join.' }));
              return;
            }

            console.log(`[Game] Player '${username}' attempting to join game ${id}.`);
            let gameState = session.game.getState();
            console.log('[Game] State before join:', {
              p1: gameState.players[0].id,
              p2: gameState.players[1].id,
              interval: !!session.interval,
              forfeitTimer: !!session.forfeitTimer,
            });

            const isTournamentGame = gameState.type === 'TOURNAMENT';
            const isPlayer1 = gameState.players[0].id === username;
            const isPlayer2 = gameState.players[1].id === username;
            const isPending = gameState.players[1].id === '__PENDING__';

            // If the player is not in the game and the game is pending, join them.
            if (!isPlayer1 && !isPlayer2 && isPending) {
              const pgClient = await app.pg.connect();
              try {
                const userRes = await pgClient.query('SELECT id FROM users WHERE name = $1', [username]);
                if (userRes.rows.length === 0) {
                  socket.send(JSON.stringify({ type: 'error', message: 'Joining player not found in database.' }));
                  return;
                }
                const joiningUserDbId = userRes.rows[0].id;

                console.log(`[Game] Player '${username}' (dbId: ${joiningUserDbId}) is joining as P2.`);
                session.game.joinPlayer(username, joiningUserDbId);

                // The second player has joined, so clear the forfeit timer and start the game.
                if (session.forfeitTimer) {
                  console.log(`[Game] Second player joined. Clearing forfeit timer for game ${id}.`);
                  clearTimeout(session.forfeitTimer);
                  session.forfeitTimer = undefined;
                }

                if (!session.interval) {
                  console.log(`[Game] Both players present. Starting game loop for game ${id}.`);
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
              } finally {
                pgClient.release();
              }
            } else if (isPlayer1 && isPending && isTournamentGame && !session.forfeitTimer && !session.interval) {
              // This is the first player in a tournament game. Start the forfeit timer.
              console.log(`[Game] First player '${username}' in tournament game ${id}. Starting 30s forfeit timer.`);
              socket.send(JSON.stringify({ type: 'forfeit_timer_started', payload: { duration: 30 } }));
              session.forfeitTimer = setTimeout(async () => {
                console.log(`[Game] Forfeit timer expired for game ${id}.`);
                const presentPlayer = session.game.getState().players.find(p => p.id !== '__PENDING__');
                if (presentPlayer) {
                  session.game.handleInput(presentPlayer.id, { type: 'forfeit', ts: Date.now() });
                  const pgClient = await app.pg.connect();
                  try {
                    await session.game.step(1 / 60, pgClient); // Process the forfeit
                    broadcastGameState(id);
                  } finally {
                    pgClient.release();
                  }
                }
              }, 30000); // 30 seconds
            } else if (!isPending) {
              console.warn(`[Game] Player '${username}' attempted to join game ${id}, but it is already full.`);
              socket.send(JSON.stringify({ type: 'error', message: 'Game is not available for joining.' }));
              return;
            }

            const token = genToken(id, username);
            socket.send(JSON.stringify({ type: 'join_success', data: { token, playerId: username } }));
            
            gameState = session.game.getState();
            console.log('[Game] State after join:', {
              p1: gameState.players[0].id,
              p2: gameState.players[1].id,
              interval: !!session.interval,
              forfeitTimer: !!session.forfeitTimer,
            });

            break;
          }
        }
      } catch (err) {
        console.error('[WS] Error processing message:', err);
      }
    });

    socket.on('close', () => {
      console.log(`[WS] Client disconnected from game ${id}`);
      leaveGame(id, socket);
    });
  });

 app.post<{
    Body: { id: number;
							playerisLeft: boolean;
							bonus: string; }
  }>('/applyBonus', async (request, reply) =>
  {
    const pgClient = await app.pg.connect();
    try
    {
      const userRes = await pgClient.query('SELECT id FROM apply_bonus($1, $2)', [request.body.id, request.body.playerisLeft]);
      if (userRes.rows && userRes[0])
        console.log(userRes.rows[0].msg);
      else
        console.log("[ApplyBonus] Error no rows");
    }
    catch (err)
    {
        console.error('[ApplyBonus] Error query:', err);
    }
  });

  app.post<{
    Body: { id: number;
							playerisLeft: boolean;
          }
  }>('/block', async (request, reply) =>
  {
    const pgClient = await app.pg.connect();
    try
    {
      const userRes = await pgClient.query('SELECT id FROM successfull_block($1, $2)', [request.body.id, request.body.playerisLeft]);
      if (userRes.rows && userRes[0])
        console.log(userRes.rows[0].msg);
      else
        console.log("[Block] Error no rows");
    }
    catch (err)
    {
        console.error('[Block] Error query:', err);
    }
  });
}
