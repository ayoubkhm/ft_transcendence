
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
        const result = await client.query('SELECT id, state, name, min_players, max_players, nbr_players, owner_id FROM tournaments');
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
      
      switch (type) {
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
          if (typeof tournament_id !== 'number' || typeof user_id !== 'number') {
              throw new Error('leave_tournament requires tournament_id and user_id.');
          }
          const client = await req.server.pg.connect();
          try {
              const tourRes = await client.query('SELECT name FROM tournaments WHERE id = $1', [tournament_id]);
              if (tourRes.rows.length === 0) throw new Error('Tournament not found.');
              await client.query('SELECT * FROM leave_tournament($1::INTEGER, $2::TEXT)', [user_id, tourRes.rows[0].name]);
              await broadcastTournamentUpdate(req.server, tournament_id, client);
              await broadcastDashboardUpdate(req.server, client);
              leaveGroup(conn, tournament_id);
          } finally {
              client.release();
          }
          break;
        }
        default:
          safeSend(conn, { type: 'error', message: 'Unknown message type' });
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
      console.error("[WS] Error processing message:", errorMessage);
      safeSend(conn, { type: 'error', message: 'Invalid message format or failed to process', details: errorMessage });
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
