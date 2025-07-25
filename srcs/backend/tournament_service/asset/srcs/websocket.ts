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
  console.log(`[WS LOG] User ${connection.userId} successfully joined group ${groupId}.`);
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
  console.log(`[WS] Connection from user ${connection.userId} left group ${groupId}.`);
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
    console.log(`[Broadcast] Starting update for tournamentId: ${tournamentId}`);
    
    const connections = socketsGroups.get(tournamentId);
    if (!connections || connections.size === 0) {
      console.log(`[Broadcast] No active connections found for tournamentId: ${tournamentId}. Aborting.`);
      return;
    }
    const recipientUserIds = Array.from(connections).map(conn => conn.userId || 'N/A');
    console.log(`[Broadcast] Found ${connections.size} connection(s) for tournamentId: ${tournamentId}. Recipients: [${recipientUserIds.join(', ')}]`);
  
    const client = pgClient || await server.pg.connect();
    console.log('[Broadcast] Acquired DB client.');
    try {
      console.log('[Broadcast] Querying DB for tournament, players, and brackets...');
      const [tournamentRes, playersRes, bracketsRes] = await Promise.all([
        client.query('SELECT id, state, name, nbr_players, min_players, max_players, owner_id FROM tournaments WHERE id = $1', [tournamentId]),
        client.query('SELECT u.id, u.name, tp.is_ready FROM users u JOIN tournaments_players tp ON u.id = tp.player_id WHERE tp.tournament_id = $1', [tournamentId]),
        client.query('SELECT * FROM get_brackets($1::INTEGER)', [tournamentId])
      ]);
      console.log(`[Broadcast] DB queries complete. Found ${tournamentRes.rows.length} tournament(s), ${playersRes.rows.length} player(s).`);
  
      if (tournamentRes.rows.length === 0) {
        console.log(`[Broadcast] Tournament ${tournamentId} not found in DB. Sending delete message.`);
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
      console.log(`[Broadcast] Owner name: ${ownerName}, Brackets found: ${!!brackets}`);
  
      const fullState = {
        type: 'tournament-update',
        data: { ...tournament, owner_name: ownerName, players: playersRes.rows, brackets: brackets },
      };
      console.log('[Broadcast] Constructed fullState message:', JSON.stringify(fullState, null, 2));
  
      let sentCount = 0;
      for (const connection of connections) {
        if (safeSend(connection, fullState)) {
          sentCount++;
        }
      }
      console.log(`[Broadcast] Sent 'tournament-update' to ${sentCount} of ${connections.size} client(s).`);
    } catch (err) {
      console.error(`[Broadcast] FAILED to broadcast for tournament ${tournamentId}:`, err);
    } finally {
      if (!pgClient) {
        client.release();
        console.log('[Broadcast] Released DB client.');
      }
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
  const server = req.server;
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

            // Add the creator to the tournament's group so they receive updates
            conn.userId = owner_id;
            joinGroup(conn, creationResult.tid);

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
          console.log(`[WS LOG] Received get_tournament_details for tournament ${tournament_id}. Subscribing user ${conn.userId} and sending details directly.`);
          joinGroup(conn, tournament_id);
          
          const client = await req.server.pg.connect();
          try {
            const [tournamentRes, playersRes, bracketsRes] = await Promise.all([
              client.query('SELECT id, state, name, nbr_players, min_players, max_players, owner_id FROM tournaments WHERE id = $1', [tournament_id]),
              client.query('SELECT u.id, u.name, tp.is_ready FROM users u JOIN tournaments_players tp ON u.id = tp.player_id WHERE tp.tournament_id = $1', [tournament_id]),
              client.query('SELECT * FROM get_brackets($1::INTEGER)', [tournament_id])
            ]);

            if (tournamentRes.rows.length > 0) {
              const tournament = tournamentRes.rows[0];
              const ownerRes = await client.query('SELECT name FROM users WHERE id = $1', [tournament.owner_id]);
              const ownerName = ownerRes.rows.length > 0 ? ownerRes.rows[0].name : 'Unknown';
              const brackets = bracketsRes.rows.length > 0 && bracketsRes.rows[0].success ? bracketsRes.rows[0].brackets : [];

              const fullState = {
                type: 'tournament-update',
                data: { ...tournament, owner_name: ownerName, players: playersRes.rows, brackets: brackets },
              };
              safeSend(conn, fullState);
            } else {
              // If no tournament is found, it was likely deleted. Inform the client.
              console.log(`[WS LOG] Tournament ${tournament_id} not found. Informing client it was deleted.`);
              safeSend(conn, { type: 'tournament-deleted', data: { tournament_id: tournament_id } });
            }
          } finally {
            client.release();
          }
          break;
        }
        case 'join_tournament': {
          if (typeof tournament_id !== 'number' || typeof user_id !== 'number') {
            throw new Error('join_tournament requires tournament_id and user_id.');
          }
          conn.userId = user_id; // Associate user with this connection

          const client = await req.server.pg.connect();
          try {
            const tourRes = await client.query('SELECT name FROM tournaments WHERE id = $1', [tournament_id]);
            if (tourRes.rows.length === 0) throw new Error('Tournament not found.');
            
            const joinResult = await client.query('SELECT * FROM join_tournament($1::INTEGER, $2::TEXT)', [user_id, tourRes.rows[0].name]);
            if (!joinResult.rows[0].success) {
              throw new Error(joinResult.rows[0].msg || 'Failed to join tournament in DB.');
            }

            // Send a specific success message back to the user who joined
            safeSend(conn, { type: 'join_tournament_success', data: { tournament_id } });

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
        case 'toggle_ready_status': {
          if (typeof tournament_id !== 'number' || typeof user_id !== 'number') {
            throw new Error('toggle_ready_status requires tournament_id and user_id.');
          }
          const client = await req.server.pg.connect();
          try {
            await client.query('SELECT * FROM toggle_player_ready($1::INTEGER, $2::INTEGER)', [user_id, tournament_id]);
            await broadcastTournamentUpdate(req.server, tournament_id, client);
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
            const startResult = await client.query('SELECT * FROM start_tournament($1::TEXT)', [name]);
            if (!startResult.rows[0].success) {
              throw new Error(startResult.rows[0].msg || 'Failed to start tournament in DB.');
            }
            
            // Immediately generate the first round of matches
            await client.query('SELECT * FROM next_round($1::INTEGER)', [tournamentId]);

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
    console.log(`[WS] Client disconnected. User ID: ${conn.userId}`);
    const groups = socketToGroups.get(conn);
    if (groups) {
      const groupsCopy = new Set(groups);
      for (const groupId of groupsCopy) {
        leaveGroup(conn, groupId);
      }
    }
  });
};


export default function websocketRoutes(server: FastifyInstance) {
  server.get('/api/tournaments/ws', { websocket: true }, websocketHandler);
}