import Fastify from 'fastify';
import FastifyPostgres from '@fastify/postgres';
import fastifyWebsocket from '@fastify/websocket';
import 'dotenv/config';
import { WebSocket, RawData } from 'ws';
import { PoolClient } from 'pg';

const server = Fastify();

// Global maps to track socket memberships
const socketsGroups = new Map<number, Set<WebSocket>>(); // groupId -> Set<WebSocket>
const socketToGroups = new Map<WebSocket, Set<number>>(); // WebSocket -> Set<groupId>

/**
 * Joins a socket to a specific group.
 * @param socket The WebSocket client.
 * @param groupId The ID of the group (tournamentId) to join.
 */
function joinGroup(socket: WebSocket, groupId: number) {
  // Add socket to the group
  if (!socketsGroups.has(groupId)) {
    socketsGroups.set(groupId, new Set());
  }
  socketsGroups.get(groupId)!.add(socket);

  // Track the group membership for the socket
  if (!socketToGroups.has(socket)) {
    socketToGroups.set(socket, new Set());
  }
  socketToGroups.get(socket)!.add(groupId);
  console.log(`[WS] Socket joined group ${groupId}.`);
}

/**
 * Removes a socket from a specific group.
 * @param socket The WebSocket client.
 * @param groupId The ID of the group (tournamentId) to leave.
 */
function leaveGroup(socket: WebSocket, groupId: number) {
  const group = socketsGroups.get(groupId);
  if (group) {
    group.delete(socket);
    if (group.size === 0) {
      socketsGroups.delete(groupId);
    }
  }
  const groups = socketToGroups.get(socket);
  if (groups) {
    groups.delete(groupId);
    if (groups.size === 0) {
      socketToGroups.delete(socket);
    }
  }
  console.log(`[WS] Socket left group ${groupId}.`);
}

/**
 * Fetches the full state of a tournament and broadcasts it to all clients in that tournament's group.
 * @param tournamentId The ID of the tournament to update.
 * @param pgClient Optional pg client to reuse an existing transaction.
 */
async function broadcastTournamentUpdate(tournamentId: number, pgClient?: PoolClient) {
    const connections = socketsGroups.get(tournamentId);
    if (!connections || connections.size === 0) return;
  
    console.log(`[WS] Broadcasting update for tournament ${tournamentId} to ${connections.size} client(s).`);
    const client = pgClient || await server.pg.connect();
    try {
      const [tournamentRes, playersRes, bracketsRes] = await Promise.all([
        client.query('SELECT id, state, name, nbr_players, max_players, owner_id FROM tournaments WHERE id = $1', [tournamentId]),
        client.query('SELECT u.id, u.name FROM users u JOIN tournaments_players tp ON u.id = tp.player_id WHERE tp.tournament_id = $1', [tournamentId]),
        client.query('SELECT * FROM get_brackets($1::INTEGER)', [tournamentId])
      ]);
  
      if (tournamentRes.rows.length === 0) {
        const deleteMessage = JSON.stringify({ type: 'tournament-deleted', tournament_id: tournamentId });
        for (const connection of connections) {
          connection.send(deleteMessage);
        }
        socketsGroups.delete(tournamentId);
        return;
      }
  
      const tournament = tournamentRes.rows[0];
      const ownerRes = await client.query('SELECT name FROM users WHERE id = $1', [tournament.owner_id]);
      const ownerName = ownerRes.rows.length > 0 ? ownerRes.rows[0].name : 'Unknown';
      const brackets = bracketsRes.rows.length > 0 && bracketsRes.rows[0].success ? bracketsRes.rows[0].brackets : [];
  
      const fullState = {
        type: 'tournament-update',
        data: { ...tournament, owner_name: ownerName, players: playersRes.rows, brackets: brackets },
      };
  
      const message = JSON.stringify(fullState);
      for (const connection of connections) {
        connection.send(message);
      }
    } catch (err) {
      console.error(`[WS] Failed to broadcast for tournament ${tournamentId}:`, err);
    } finally {
      if (!pgClient) client.release();
    }
}

/**
 * Fetches the list of all tournaments and sends it to the "dashboard" group (ID 0).
 * @param pgClient Optional pg client to reuse an existing transaction.
 */
async function broadcastDashboardUpdate(pgClient?: PoolClient) {
    const connections = socketsGroups.get(0); // Group 0 is the dashboard
    if (!connections || connections.size === 0) return;

    console.log(`[WS] Broadcasting dashboard update to ${connections.size} client(s).`);
    const client = pgClient || await server.pg.connect();
    try {
        const result = await client.query('SELECT id, state, name, min_players, max_players, nbr_players, owner_id FROM tournaments');
        const message = JSON.stringify({ type: 'dashboard-update', data: result.rows });
        for(const connection of connections) {
            connection.send(message);
        }
    } catch (err) {
        console.error('[WS] Failed to broadcast dashboard update:', err);
    } finally {
        if (!pgClient) client.release();
    }
}

// Centralized WebSocket endpoint
server.get('/api/tournaments/ws', { websocket: true }, (connection: SocketStream, request) => {
    console.log('[WS] Received a new WebSocket connection request.');
    console.log('[WS] Request headers:', request.headers);

    const socket = connection.socket;
    console.log('[WS] Client connected.');
  
    // By default, join the main "dashboard" group (ID 0)
    joinGroup(socket, 0);
    broadcastDashboardUpdate(); // Send initial list of tournaments
  
    socket.on('message', async (raw: RawData) => {
      try {
        const msg = JSON.parse(raw.toString());
        const { type, tournament_id, user_id } = msg;
  
        if (!type) throw new Error("Message must have a 'type' property.");
  
        switch (type) {
          case 'join_tournament': {
            if (typeof tournament_id !== 'number' || typeof user_id !== 'number') {
              throw new Error('join_tournament requires tournament_id and user_id.');
            }
            const client = await server.pg.connect();
            try {
              const tourRes = await client.query('SELECT name FROM tournaments WHERE id = $1', [tournament_id]);
              if (tourRes.rows.length === 0) throw new Error('Tournament not found.');
              await client.query('SELECT * FROM join_tournament($1::INTEGER, $2::TEXT)', [user_id, tourRes.rows[0].name]);
              joinGroup(socket, tournament_id);
              await broadcastTournamentUpdate(tournament_id, client);
              await broadcastDashboardUpdate(client);
            } finally {
              client.release();
            }
            break;
          }
          case 'leave_tournament': {
            if (typeof tournament_id !== 'number' || typeof user_id !== 'number') {
                throw new Error('leave_tournament requires tournament_id and user_id.');
            }
            const client = await server.pg.connect();
            try {
                const tourRes = await client.query('SELECT name FROM tournaments WHERE id = $1', [tournament_id]);
                if (tourRes.rows.length === 0) throw new Error('Tournament not found.');
                await client.query('SELECT * FROM leave_tournament($1::INTEGER, $2::TEXT)', [user_id, tourRes.rows[0].name]);
                await broadcastTournamentUpdate(tournament_id, client);
                await broadcastDashboardUpdate(client);
                leaveGroup(socket, tournament_id);
            } finally {
                client.release();
            }
            break;
          }
          case 'subscribe_to_tournaments': {
            if (!Array.isArray(msg.tournament_ids)) throw new Error("subscribe_to_tournaments requires 'tournament_ids' array.");
            for (const id of msg.tournament_ids) {
                if (typeof id === 'number') {
                    joinGroup(socket, id);
                    await broadcastTournamentUpdate(id); // Send initial state
                }
            }
            break;
          }
          default:
            socket.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
        }
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
        console.error("[WS] Error processing message:", errorMessage);
        socket.send(JSON.stringify({ type: 'error', message: 'Invalid message format or failed to process', details: errorMessage }));
      }
    });
  
    socket.on('close', () => {
      console.log('[WS] Client disconnected.');
      const groups = socketToGroups.get(socket);
      if (groups) {
        for (const groupId of groups) {
          const group = socketsGroups.get(groupId);
          group?.delete(socket);
          if (group?.size === 0) {
            socketsGroups.delete(groupId);
          }
        }
      }
      socketToGroups.delete(socket);
    });
});

server.listen({ port: 3000, host: '0.0.0.0' })
  .then((address) => {
    console.log(`🚀 Tournament service listening at ${address}`);
  })
  .catch((err) => {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  });

// ─── Plugins ──────────────────────────────────────
server.register(FastifyPostgres, { connectionString: process.env.DATABASE_URL });
server.register(fastifyWebsocket);

// ─── HTTP Routes for one-off actions ──────────────────────────────────

server.post<{Body: {name?: string; owner_id?: number;};}>('/', async (request, reply) => {
  const { name, owner_id } = request.body;
  if (!name || typeof owner_id !== 'number')
    return reply.status(400).send({ success: false, msg: 'Missing or invalid name/owner_id' });

  const client = await server.pg.connect();
  try {
    const result = await client.query('SELECT * FROM new_tournament($1::TEXT, $2::INTEGER)', [name, owner_id]);
    if (result.rows.length === 0)
      return reply.status(500).send({ success: false, msg: 'Tournament creation failed' });
    
    await broadcastDashboardUpdate(client);
    return reply.send(result.rows[0]);
  } catch (err) {
    console.error('Error in POST /:', err);
    return reply.status(500).send({ success: false, msg: 'Internal server error' });
  } finally {
    client.release();
  }
});

server.post<{ Params: { name: string } }>('/:name/start', async (request, reply) => {
    const { name } = request.params;
    if (!name) return reply.status(400).send({ success: false, msg: 'Missing tournament name' });
  
    const client = await server.pg.connect();
    try {
      const tourRes = await client.query('SELECT id, state FROM tournaments WHERE name = $1', [name]);
      if (tourRes.rows.length === 0)
        return reply.status(404).send({ success: false, msg: 'Tournament not found' });
      if (tourRes.rows[0].state !== 'LOBBY')
        return reply.status(409).send({ success: false, msg: 'Tournament has already started or is finished.' });
      
      const tournamentId = tourRes.rows[0].id;
      const result = await client.query('SELECT * FROM start_tournament($1::TEXT)', [name]);
      if (result.rows.length === 0 || !result.rows[0].success)
        return reply.status(500).send({ success: false, msg: 'Start tournament failed' });
  
      await broadcastTournamentUpdate(tournamentId, client);
      await broadcastDashboardUpdate(client);
      return reply.send(result.rows[0]);
    } catch (err) {
      console.error('Error in /:name/start:', err);
      return reply.status(500).send({ success: false, msg: 'Internal server error' });
    } finally {
      client.release();
    }
});

server.delete<{ Params: { name: string } }>('/:name', async (request, reply) => {
    const { name } = request.params;
    if (!name) return reply.status(400).send({ error: 'Missing tournament name' });
  
    const client = await server.pg.connect();
    try {
      const tournamentRes = await client.query('SELECT id FROM tournaments WHERE name = $1', [name]);
      if (tournamentRes.rows.length === 0)
        return reply.status(404).send({ error: 'Tournament not found' });
      
      const tournamentId = tournamentRes.rows[0].id;
      const result = await client.query('SELECT * FROM delete_tournament($1::TEXT)', [name]);
      if (result.rows.length === 0)
        return reply.status(500).send({ error: 'Unexpected error during deletion' });
  
      await broadcastTournamentUpdate(tournamentId, client); 
      await broadcastDashboardUpdate(client);
      return reply.send(result.rows[0]);
    } catch (err) {
      console.error('Error in DELETE /:name:', err);
      return reply.status(500).send({ error: 'Internal server error' });
    } finally {
      client.release();
    }
});

server.post<{ Body: { gameId: number; winnerId: number; p1_score: number; p2_score: number; } }>('/game/end', async (request, reply) => {
    const { gameId, winnerId, p1_score, p2_score } = request.body;
    if (!gameId || !winnerId || p1_score === undefined || p2_score === undefined)
      return reply.status(400).send({ success: false, msg: 'Missing required game data.' });
  
    const client = await server.pg.connect();
    try {
      const gameQuery = await client.query('SELECT tournament_id, p1_id FROM games WHERE id = $1', [gameId]);
      if (gameQuery.rows.length === 0)
        return reply.status(404).send({ success: false, msg: 'Game not found.' });
      
      const { tournament_id, p1_id } = gameQuery.rows[0];
  
      await client.query(
        `UPDATE games SET state = 'OVER', winner = ($1 = $2), p1_score = $3, p2_score = $4 WHERE id = $5`,
        [winnerId, p1_id, p1_score, p2_score, gameId]
      );
  
      await client.query(`SELECT * FROM next_round($1::INTEGER)`, [tournament_id]);
  
      await broadcastTournamentUpdate(tournament_id, client);
      await broadcastDashboardUpdate(client);
  
      return reply.send({ success: true, msg: 'Tournament updated successfully.' });
    } catch (err) {
      console.error('Error in /game/end:', err);
      return reply.status(500).send({ success: false, msg: 'Internal server error' });
    } finally {
      client.release();
    }
});