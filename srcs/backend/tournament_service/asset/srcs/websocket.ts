
import { FastifyInstance, FastifyRequest } from 'fastify';
import { RawData, WebSocket } from 'ws';
import { PoolClient } from 'pg';
import { WebsocketHandler } from '@fastify/websocket';
import { SocketStream } from './types';

const WS_OPEN = 1;

// --- WebSocket Connection Management ---
const socketsGroups = new Map<number, Set<SocketStream>>(); // groupId -> Set<SocketStream>
const socketToGroups = new Map<SocketStream, Set<number>>(); // SocketStream -> Set<groupId>

function joinGroup(connection: SocketStream, groupId: number) {
  if (!socketsGroups.has(groupId)) {
    socketsGroups.set(groupId, new Set());
  }
  socketsGroups.get(groupId)!.add(connection);

  if (!socketToGroups.has(connection)) {
    socketToGroups.set(connection, new Set());
  }
  socketToGroups.get(connection)!.add(groupId);
  console.log(`[WS] Connection joined group ${groupId}.`);
}

function leaveGroup(connection: SocketStream, groupId: number) {
  const group = socketsGroups.get(groupId);
  if (group) {
    group.delete(connection);
    if (group.size === 0) {
      socketsGroups.delete(groupId);
    }
  }
  const groups = socketToGroups.get(connection);
  if (groups) {
    groups.delete(groupId);
    if (groups.size === 0) {
      socketToGroups.delete(connection);
    }
  }
  console.log(`[WS] Connection left group ${groupId}.`);
}

// --- Broadcasting Logic ---
function safeSend(connection: SocketStream, payload: unknown): boolean {
  const msg = typeof payload === 'string' ? payload : JSON.stringify(payload);
  if (connection.readyState === WS_OPEN) {
    connection.send(msg);
    return true;
  }
  return false;
}

export async function broadcastTournamentUpdate(server: FastifyInstance, tournamentId: number, pgClient?: PoolClient) {
    const connections = socketsGroups.get(tournamentId);
    if (!connections || connections.size === 0) return;
  
    const client = pgClient || await server.pg.connect();
    try {
      const [tournamentRes, playersRes, bracketsRes] = await Promise.all([
        client.query('SELECT id, state, name, nbr_players, max_players, owner_id FROM tournaments WHERE id = $1', [tournamentId]),
        client.query('SELECT u.id, u.name FROM users u JOIN tournaments_players tp ON u.id = tp.player_id WHERE tp.tournament_id = $1', [tournamentId]),
        client.query('SELECT * FROM get_brackets($1::INTEGER)', [tournamentId])
      ]);
  
      if (tournamentRes.rows.length === 0) {
        const deleteMessage = { type: 'tournament-deleted', tournament_id: tournamentId };
        for (const connection of connections) {
          safeSend(connection, deleteMessage);
        }
        socketsGroups.delete(tournamentId);
        return;
      }
  
      const tournament = tournamentRes.rows[0];
      const ownerRes = await client.query('SELECT name FROM users WHERE id = $1', [tournament.owner_id]);
      const ownerName = ownerRes.rows.length > 0 ? ownerRes.rows[0].name : 'Unknown';
      const brackets = bracketsRes.rows.length > 0 && bracketsRes.rows[0].success ? bracketsRes.rows[0].brackets : [];
  
      console.log(`[WS] Broadcasting update for tournament ${tournamentId} with brackets:`, JSON.stringify(brackets, null, 2));

      const fullState = {
        type: 'tournament-update',
        data: { ...tournament, owner_name: ownerName, players: playersRes.rows, brackets: brackets },
      };
  
      for (const connection of connections) {
        safeSend(connection, fullState);
      }
    } catch (err) {
      console.error(`[WS] Failed to broadcast for tournament ${tournamentId}:`, err);
    } finally {
      if (!pgClient) client.release();
    }
}

export async function broadcastDashboardUpdate(server: FastifyInstance, pgClient?: PoolClient) {
    const connections = socketsGroups.get(0);
    if (!connections || connections.size === 0) return;

    const client = pgClient || await server.pg.connect();
    try {
        const result = await client.query('SELECT t.id, t.state, t.name, t.min_players, t.max_players, t.nbr_players, t.owner_id, u.name as owner_name FROM tournaments t JOIN users u ON t.owner_id = u.id');
        const message = { type: 'dashboard-update', data: result.rows };
        for(const connection of connections) {
            safeSend(connection, message);
        }
    } catch (err) {
        console.error('[WS] Failed to broadcast dashboard update:', err);
    } finally {
        if (!pgClient) client.release();
    }
}

const websocketHandler: WebsocketHandler = (connection, req) => {
  const conn = connection as unknown as SocketStream;
  console.log('[WS] Client connected.');
  joinGroup(conn, 0);
  broadcastDashboardUpdate(req.server, undefined);

  conn.on('message', async (raw: RawData) => {
    try {
      const msg = JSON.parse(raw.toString());
      const { type, tournament_id, user_id } = msg;
      if (!type) throw new Error("Message must have a 'type' property.");
      
      // Note: The 'catch' block below will handle errors for all cases.
      switch (type) {
        case 'create_tournament': {
          const { name, owner_id } = msg;
          if (!name || typeof owner_id !== 'number') {
            throw new Error('create_tournament requires a name and owner_id.');
          }
          const client = await req.server.pg.connect();
          try {
            const result = await client.query('SELECT * FROM new_tournament($1::TEXT, $2::INTEGER)', [name, owner_id]);
            const creationResult = result.rows[0];

            if (!creationResult.success) {
              throw new Error(creationResult.msg || 'Tournament creation failed in database.');
            }

            // Send a specific confirmation to the creator with the new ID and original name
            safeSend(conn, {
              type: 'tournament-created',
              data: { id: creationResult.tid, name: name }
            });

            // Broadcast the updated list to everyone
            await broadcastDashboardUpdate(req.server, client);
          } finally {
            client.release();
          }
          break;
        }
        case 'delete_tournament': {
          const { name, owner_id } = msg;
          if (!name || typeof owner_id !== 'number') {
            throw new Error('delete_tournament requires a tournament name and owner_id.');
          }
          const client = await req.server.pg.connect();
          try {
            const tourRes = await client.query('SELECT id FROM tournaments WHERE name = $1 AND owner_id = $2', [name, owner_id]);
            if (tourRes.rows.length === 0) throw new Error('Tournament not found or user is not the owner.');
            const tournamentId = tourRes.rows[0].id;
            await client.query('SELECT * FROM delete_tournament($1::TEXT)', [name]);
            await broadcastTournamentUpdate(req.server, tournamentId, client);
            await broadcastDashboardUpdate(req.server, client);
          } finally {
            client.release();
          }
          break;
        }
        case 'get_tournament_details': {
          if (typeof tournament_id !== 'number') {
            throw new Error('get_tournament_details requires a tournament_id.');
          }
          // This doesn't broadcast, it just sends the details back to the requester
          await broadcastTournamentUpdate(req.server, tournament_id);
          break;
        }
        case 'join_tournament': {
          if (typeof tournament_id !== 'number' || typeof user_id !== 'number') {
            throw new Error('join_tournament requires tournament_id and user_id.');
          }
          const client = await req.server.pg.connect();
          try {
            const tourRes = await client.query('SELECT name FROM tournaments WHERE id = $1', [tournament_id]);
            if (tourRes.rows.length === 0) throw new Error('Tournament not found.');
            await client.query('SELECT * FROM join_tournament($1::INTEGER, $2::TEXT)', [user_id, tourRes.rows[0].name]);
            joinGroup(conn, tournament_id);
            await broadcastTournamentUpdate(req.server, tournament_id, client);
            await broadcastDashboardUpdate(req.server, client);
          } finally {
            client.release();
          }
          break;
        }
        case 'leave_tournament': {
          const { tournament_id, user_id, name } = msg;
          if (typeof tournament_id !== 'number' || typeof user_id !== 'number' || !name) {
              throw new Error('leave_tournament requires tournament_id, user_id, and name.');
          }
          const client = await req.server.pg.connect();
          try {
              await client.query('SELECT * FROM leave_tournament($1::INTEGER, $2::TEXT)', [user_id, name]);
              // Broadcast updates FIRST, so the leaving user gets the message.
              await broadcastTournamentUpdate(req.server, tournament_id, client);
              await broadcastDashboardUpdate(req.server, client);
              // THEN remove the user from the group.
              leaveGroup(conn, tournament_id);
          } finally {
              client.release();
          }
          break;
        }
        case 'start_tournament': {
          const { name } = msg;
          if (!name) throw new Error('start_tournament requires a tournament name.');
          const client = await req.server.pg.connect();
          try {
            const tourRes = await client.query('SELECT id FROM tournaments WHERE name = $1', [name]);
            if (tourRes.rows.length === 0) throw new Error('Tournament not found.');
            const tournamentId = tourRes.rows[0].id;

            // Start the tournament first
            await client.query('SELECT * FROM start_tournament($1::TEXT)', [name]);
            
            // Immediately generate the first round of matches
            console.log(`[WS] Generating first round for tournament ${tournamentId}...`);
            await client.query('SELECT * FROM next_round($1::INTEGER)', [tournamentId]);
            console.log(`[WS] First round generated.`);

            // Now broadcast the update, which will include the newly created matches
            await broadcastTournamentUpdate(req.server, tournamentId, client);
            await broadcastDashboardUpdate(req.server, client);
          } finally {
            client.release();
          }
          break;
        }
        default:
          // Send an error message back to the client for unknown message types
          throw new Error(`Unknown message type: ${type}`);
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
      console.error("[WS] Error processing message:", errorMessage);
      // Send a specific error message back to the originating client
      safeSend(conn, { 
        type: 'error', 
        message: 'Failed to process your request.', 
        details: errorMessage 
      });
    }
  });

  conn.on('close', () => {
    console.log('[WS] Client disconnected.');
    const groups = socketToGroups.get(conn);
    if (groups) {
      for (const groupId of groups) {
        leaveGroup(conn, groupId);
      }
    }
  });
};


export default function websocketRoutes(server: FastifyInstance) {
  server.get('/api/tournaments/ws', { websocket: true }, websocketHandler);
}
