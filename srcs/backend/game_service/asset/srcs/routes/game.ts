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

export function genGameToken(gameId: number, playerId: string): string
{
  return createHmac('sha256', HMAC_SECRET)
    .update(`${gameId}:${playerId}`)
    .digest('hex')
}

export function genToken(gameId: string, playerId: string): string {
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
  readyPlayers: Set<string>;
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

      // Check if the user is already in an active game
      const activeGameRes = await pgClient.query(
        "SELECT id FROM games WHERE (p1_id = $1 OR p2_id = $1) AND state != 'OVER'",
        [userId]
      );

      if (activeGameRes.rows.length > 0) {
        const activeGameId = activeGameRes.rows[0].id;
        return reply.code(409).send({ error: 'You are already in an active game.', gameId: activeGameId });
      }

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

        sessions.set(gameIdString, { game, interval, clients: new Set(), readyPlayers: new Set() });
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
        sessions.set(gameIdString, { game, clients: new Set(), readyPlayers: new Set() });
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
                const newSession = { game, clients: new Set(), readyPlayers: new Set() };
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
			const pgClient = await app.pg.connect();
			try {
				await session.game.handleInput(playerId, { type, ts }, pgClient);
			} finally {
				pgClient.release();
			}
            break;
          }
          case 'join_pvp_game': {
            const { username } = message.payload;
            if (!username) {
              socket.send(JSON.stringify({ type: 'error', message: 'Username is required to join.' }));
              return;
            }

            console.log(`[Game] Player '${username}' attempting to join game ${id}.`);
            const gameState = session.game.getState();
            const gameType = gameState.type;

            const isPlayer1 = gameState.players[0].id === username;
            const isPlayer2 = gameState.players[1].id === username;
            const isPending = gameState.players[1].id === '__PENDING__';

            // Scenario 1: Player is already in the game (reconnecting)
            if (isPlayer1 || isPlayer2) {
              console.log(`[Game] Player '${username}' is reconnecting to game ${id}.`);
              session.readyPlayers.add(username);
            }
            // Scenario 2: Player 2 is joining a pending game
            else if (isPending) {
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
                session.readyPlayers.add(username);
              } finally {
                pgClient.release();
              }
            }
            // Scenario 3: Game is full
            else {
              console.warn(`[Game] Player '${username}' attempted to join game ${id}, but it is already full.`);
              socket.send(JSON.stringify({ type: 'error', message: 'Game is not available for joining.' }));
              return;
            }

            // Check if both players are ready
            const updatedGameState = session.game.getState();
            const p1 = updatedGameState.players[0];
            const p2 = updatedGameState.players[1];

            if (session.readyPlayers.has(p1.id) && p2.id !== '__PENDING__' && session.readyPlayers.has(p2.id)) {
                if (session.forfeitTimer) {
                  console.log(`[Game] Both players ready. Clearing forfeit timer for game ${id}.`);
                  clearTimeout(session.forfeitTimer);
                  session.forfeitTimer = undefined;
                }

                if (!session.interval) {
                  console.log(`[Game] Both players present and ready. Starting game loop for game ${id}.`);
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
            } else {
                console.log(`[Game] Waiting for all players to be ready. P1 Ready: ${session.readyPlayers.has(p1.id)}, P2 Ready: ${session.readyPlayers.has(p2.id)}`);
            }

            // After handling join/reconnect, check if a forfeit timer needs to be started.
            // This applies to the first player who is alone in a competitive match.
            if (
              (gameType === 'VS' || gameType === 'TOURNAMENT') &&
              updatedGameState.players[1].id === '__PENDING__' && // P2 hasn't joined yet
              !session.forfeitTimer && !session.interval // Timer/game not already running
            ) {
              console.log(`[Game] First player '${username}' in a competitive game (${id}). Starting 30s forfeit timer.`);
              socket.send(JSON.stringify({ type: 'forfeit_timer_started', payload: { duration: 30 } }));
              
              session.forfeitTimer = setTimeout(async () => {
                console.log(`[Game] Forfeit timer expired for game ${id}.`);
                const presentPlayer = session.game.getState().players.find(p => p.id !== '__PENDING__');
                if (presentPlayer) {
                  const pgClient = await app.pg.connect();
                  try {
					await session.game.handleInput(presentPlayer.id, { type: 'forfeit', ts: Date.now() }, pgClient);
                    await session.game.step(1 / 60, pgClient); // Process the forfeit
                    broadcastGameState(id);
                  } finally {
                    pgClient.release();
                  }
                }
              }, 30000); // 30 seconds
            }

            const token = genToken(id, username);
            socket.send(JSON.stringify({ type: 'join_success', data: { token, playerId: username } }));
            broadcastGameState(id); // Send the latest state to all clients
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
      const userRes = await pgClient.query('SELECT * FROM apply_bonus($1, $2)', [request.body.id, request.body.playerisLeft]);
      if (userRes.rows && userRes[0])
        console.log(userRes.rows[0].msg);
      else
        console.log("[ApplyBonus] Error no rows");
	
	reply.send({ success :userRes.rows[0].success, msg: userRes.rows[0].msg });
    }
    catch (err)
    {
		reply.send({ success :false, msg: '[ApplyBonus]: internal server error :', err });
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
      const userRes = await pgClient.query('SELECT * FROM successfull_block($1, $2)', [request.body.id, request.body.playerisLeft]);
      if (userRes.rows && userRes[0])
        console.log(userRes.rows[0].msg);
	else
        console.log("[Block] Error no rows");
	reply.send({ success :userRes.rows[0].success, msg: userRes.rows[0].msg });
    }
    catch (err)
    {
		reply.send({ success :false, msg: '[Block]: internal server error :', err });
    }
  });

  app.post<{
    Body: {
      gameId: number;
      winnerSide: boolean;
    };
  }>('/game/end', async (request, reply) => {
    const { gameId, winnerSide } = request.body;
    
    console.log(`[Game End] Received notification for gameId: ${gameId}`);
    console.log(`[Game End]   Winner ID: ${winnerSide}`);
    // console.log(`[Game End]   Scores: P1=${p1_score}, P2=${p2_score}`);

    const client = await app.pg.connect();
    try {
      console.log(`[Game End] Calling win_game(${gameId}, ${winnerSide}) in DB...`);
      const res = await client.query(
        'SELECT * FROM win_game($1::INTEGER, $2::BOOLEAN)',
        [gameId, winnerSide]
      );

      const result = res.rows[0];
      console.log('[Game End] Received from DB:', result);

      if (result.success) {
        console.log(`[Game End] DB call successful`);
      } else {
        console.error(`[Game End] DB call failed for game ${gameId}. Reason: ${result.msg}`);
      }
      
      reply.send({ success: result.success, message: result.msg });
    } catch (err) {
      console.error(`[Game End] FATAL: Error processing game result for game ${gameId}:`, err);
      reply.status(500).send({ success: false, message: 'Internal server error.' });
    } finally {
      client.release();
      console.log(`[Game End] DB client released for game ${gameId}.`);
    }
  });

  // app.get<{
  //   Body: {username: string; 
  //           userId: number;
  //           isCustomOn: boolean; };
  //   Reply:  {
  //           success: boolean;
  //           msg: string;
  //           lobbyId?: string; }
  //   }>('/api/lobby/ws', { websocket: true }, (connection, request) => {});
}