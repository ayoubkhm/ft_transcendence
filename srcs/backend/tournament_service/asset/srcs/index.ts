import Fastify from 'fastify';
import FastifyPostgres from '@fastify/postgres';
import fastifyWebsocket from '@fastify/websocket';
import 'dotenv/config';
import bracketsRoute from './brackets'
import { WebSocket } from '@fastify/websocket';

const server = Fastify();

// In-memory store for WebSocket connections by tournament
const tournamentConnections = new Map<number, Set<WebSocket>>();


// Trust proxy headers (e.g., X-Forwarded-Proto) when behind SSL termination


server.listen({ port: 3000, host: '0.0.0.0' })
  .then((address) => {
    console.log(`🚀 Tournament service listening at ${address}`);
  })
  .catch((err) => {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  });

// ─── Plugin PostgreSQL ──────────────────────────────────────
server.register(FastifyPostgres, {
  connectionString: process.env.DATABASE_URL,
});
server.register(fastifyWebsocket);
server.register(bracketsRoute, { prefix: '/' });

// WebSocket endpoint pour chaque tournoi
server.get<{ Params: { id: string } }>('/api/tournaments/:id/ws', { websocket: true }, (connection, request) => {
  const tournamentId = parseInt(request.params.id, 10);

  console.log('[WS] CONNECT – tournament', tournamentId, 'from', request.ip);

  if (isNaN(tournamentId)) {
    connection.socket.close(1008, 'Invalid tournament ID');
    return;
  }

  // Enregistre la connexion
  let set = tournamentConnections.get(tournamentId);
  if (!set) {
    set = new Set();
    tournamentConnections.set(tournamentId, set);
  }
  set.add(connection.socket);

  connection.socket.on('message', (msg) =>
    console.log('[WS] msg from', tournamentId, ':', msg.toString()),
  );

  connection.socket.on('close', () => {
    console.log('[WS] CLOSE – tournament', tournamentId, 'from', request.ip);
    set!.delete(connection.socket);
    if (set!.size === 0) tournamentConnections.delete(tournamentId);
  });
});

// Allow GET for join via query param: GET /tournament/:id/join?user_id=xxx
server.get<{
  Params: { id: string };
  Querystring: { user_id?: string };
}>('/:id/join', async (request, reply) => {
  const tournamentId = parseInt(request.params.id, 10);
  const userId = request.query.user_id ? parseInt(request.query.user_id, 10) : undefined;
  if (isNaN(tournamentId) || !userId) {
    return reply.status(400).send({ error: 'Invalid tournament ID or missing user_id' });
  }
  const client = await server.pg.connect();
  try {
    const tournamentRes = await client.query(
      'SELECT name FROM tournaments WHERE id = $1',
      [tournamentId]
    );
    if (tournamentRes.rows.length === 0) {
      return reply.status(404).send({ error: 'Tournament not found' });
    }
    const tournamentName = tournamentRes.rows[0].name;
    const result = await client.query(
      'SELECT * FROM join_tournament($1::INTEGER, $2::TEXT)',
      [userId, tournamentName]
    );
    if (result.rows.length === 0) {
      return reply.status(500).send({ error: 'Join tournament failed' });
    }
    return reply.send(result.rows[0]);
  } catch (err) {
    console.error('Error in GET /:id/join:', err);
    return reply.status(500).send({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});


server.post<{Body: {name?: string; owner_id?: number;};}>('/', async (request, reply) => {
  
  const { name, owner_id } = request.body;
  if (!name || typeof owner_id !== 'number')
    return reply.status(400).send({ success: false, msg: 'Missing or invalid name/owner_id' });

  const client = await server.pg.connect();
  try {
    const result = await client.query(
      'SELECT * FROM new_tournament($1::TEXT, $2::INTEGER)',
      [name, owner_id]
    );

    if (result.rows.length === 0)
      return reply.status(500).send({ success: false, msg: 'Tournament creation failed (empty result)' });

    return reply.send(result.rows[0]); // { success: boolean, msg: string }
  } catch (err) {
    console.error('Error in /:', err);
    return reply.status(500).send({ success: false, msg: 'Internal server error' });
  } finally {
    client.release();
  }
});

//  curl -X POST http://localhost:3003/ 
//   -H "Content-Type: application/json" 
//   -d '{"name": "TestTournament1", "max_players": 8}'


server.post<{
  Params: { id: string };
  Body: { user_id?: number };
}>('/:id/join', async (request, reply) => {
  const tournamentId = parseInt(request.params.id, 10);
  const { user_id } = request.body;

  if (isNaN(tournamentId) || !user_id)
    {
    return reply.status(400).send({ error: 'Invalid tournament ID or missing user_id' });
  }

  const client = await server.pg.connect();
  try {
    const tournamentRes = await client.query('SELECT name FROM tournaments WHERE id = $1',[tournamentId]);
    if (tournamentRes.rows.length === 0)
      return reply.status(404).send({ error: 'Tournament not found' });

    const tournamentName = tournamentRes.rows[0].name;

    const result = await client.query('SELECT * FROM join_tournament($1::INTEGER, $2::TEXT)',[user_id, tournamentName]);

    if (result.rows.length === 0)
      return reply.status(500).send({ error: 'Join tournament failed' });

    return reply.send(result.rows[0]);
  } catch (err) {
    console.error('Error in /:id/join:', err);
    return reply.status(500).send({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// curl -X POST http://localhost:3003/1/join 
//   -H "Content-Type: application/json" 
//   -d '{"user_id": 1}'


server.get('/', async (request, reply) => {
  const client = await server.pg.connect();
  try {
    const result = await client.query('SELECT id, state, name, min_players, max_players, nbr_players, owner_id FROM tournaments');
    return reply.send(result.rows);  // ← rows = tableau d'objets JS
  } catch (err) {
    console.error('Error in /:', err);
    return reply.status(500).send({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// curl http://localhost:3003/

server.get('/allusers', async (request, reply) => {
  const client = await server.pg.connect();
  try {
    const result = await client.query('SELECT * FROM users');
    return reply.send(result.rows);  // ← rows = tableau d'objets JS
  } catch (err) {
    console.error('Error in /allusers:', err);
    return reply.status(500).send({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});


// curl http://localhost:3003/allusers

server.get<{Params: { id: string };}>('/:id/users', async (request, reply) => {
  const tournamentId = parseInt(request.params.id, 10);
  const client = await server.pg.connect();
  try {
    const result = await client.query('SELECT u.* FROM users u JOIN tournaments_players tp ON u.id = tp.player_id WHERE tp.tournament_id = $1', [tournamentId]);
    return reply.send(result.rows);  // ← rows = tableau d'objets JS
  } catch (err) {
    console.error('Error in /:id/users', err);
    return reply.status(500).send({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// curl http://localhost:3003/1/users

server.get<{Params: { id: string };}>('/:id', async (request, reply) => {
  const tournamentId = parseInt(request.params.id, 10);
  if (isNaN(tournamentId)) {
    return reply.status(400).send({ error: 'Invalid tournament ID' });
  }

  const client = await server.pg.connect();
  try {
    const tournamentRes = await client.query(
      'SELECT id, state, name, nbr_players, max_players, owner_id FROM tournaments WHERE id = $1',
      [tournamentId]
    );

    if (tournamentRes.rows.length === 0) {
      return reply.status(404).send({ error: 'Tournament not found' });
    }

    const tournament = tournamentRes.rows[0];

    const ownerRes = await client.query('SELECT name FROM users WHERE id = $1', [tournament.owner_id]);
    const ownerName = ownerRes.rows.length > 0 ? ownerRes.rows[0].name : 'Unknown';

    const playersRes = await client.query(
      'SELECT u.id, u.name FROM users u JOIN tournaments_players tp ON u.id = tp.player_id WHERE tp.tournament_id = $1',
      [tournamentId]
    );

    const response = {
      ...tournament,
      owner_name: ownerName,
      players: playersRes.rows,
    };

    return reply.send(response);
  } catch (err) {
    console.error('Error in /:id:', err);
    return reply.status(500).send({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// curl http://localhost:3003/1

server.get<{ Params: { id: string } }>('/:id/lobby', async (request, reply) => {
    const tournamentId = parseInt(request.params.id, 10);
    if (isNaN(tournamentId)) {
        return reply.status(400).send({ error: 'Invalid tournament ID' });
    }

    const client = await server.pg.connect();
    try {
        const result = await client.query(
            `SELECT u.id, u.name 
             FROM users u 
             JOIN tournaments_players tp ON u.id = tp.player_id 
             WHERE tp.tournament_id = $1`,
            [tournamentId]
        );
        return reply.send(result.rows);
    } catch (err) {
        console.error('Error in /:id/lobby:', err);
        return reply.status(500).send({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

server.post<{
  Params: { id: string };
  Body: { name?: string };
}>('/:id/leave', async (request, reply) => {
  const playerId = parseInt(request.params.id, 10);
  const { name } = request.body;

  if (isNaN(playerId) || !name)
    return reply.status(400).send({ error: 'Invalid player ID or missing tournament name' });

  const client = await server.pg.connect();
  try {
    const result = await client.query(
      'SELECT * FROM leave_tournament($1::INTEGER, $2::TEXT)',
      [playerId, name]
    );

    if (result.rows.length === 0)
      return reply.status(500).send({ error: 'Leave tournament failed' });

    return reply.send(result.rows[0]);
  } catch (err) {
    console.error('Error in /:id/leave:', err);
    return reply.status(500).send({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// curl -X POST http://localhost:3003/1/leave 
//   -H "Content-Type: application/json" 
//   -d '{"name": "ouais"}'

server.post<{ Params: { name: string } }>(
  '/:name/start',
  async (request, reply) => {
    const { name } = request.params;

    if (!name) {
      return reply.status(400).send({ success: false, msg: 'Missing tournament name' });
    }

    const client = await server.pg.connect();
    try {
      // First, check the tournament state
      const stateRes = await client.query('SELECT state FROM tournaments WHERE name = $1', [name]);
      if (stateRes.rows.length === 0) {
        return reply.status(404).send({ success: false, msg: 'Tournament not found' });
      }
      if (stateRes.rows[0].state !== 'LOBBY') {
        return reply.status(409).send({ success: false, msg: 'Tournament has already started or is finished.' });
      }

      const result = await client.query(
        'SELECT * FROM start_tournament($1::TEXT)',
        [name]
      );

      if (result.rows.length === 0) {
        return reply.status(500).send({ success: false, msg: 'Start tournament failed' });
      }

      return reply.send(result.rows[0]); // { success: true/false, msg: string }
    } catch (err) {
      console.error('Error in /:name/start:', err);
      return reply.status(500).send({ success: false, msg: 'Internal server error' });
    } finally {
      client.release();
    }
  }
);

//  curl -X POST localhost:3003/PongCup/start 

server.delete<{
  Params: { name: string };
}>('/:name', async (request, reply) => {
  const { name } = request.params;

  if (!name) {
    return reply.status(400).send({ error: 'Missing tournament name' });
  }

  const client = await server.pg.connect();
  try {
    const tournamentRes = await client.query('SELECT id FROM tournaments WHERE name = $1', [name]);
    if (tournamentRes.rows.length === 0) {
      return reply.status(404).send({ error: 'Tournament not found' });
    }
    const tournamentId = tournamentRes.rows[0].id;

    const result = await client.query(
      'SELECT * FROM delete_tournament($1::TEXT)',
      [name]
    );

    if (result.rows.length === 0) {
      return reply.status(500).send({ error: 'Unexpected error during deletion' });
    }

    const connections = tournamentConnections.get(tournamentId);
    if (connections) {
      for (const connection of connections) {
        connection.send(JSON.stringify({ type: 'tournament-deleted' }));
        connection.close(1000, 'Tournament deleted');
      }
      tournamentConnections.delete(tournamentId);
    }

    return reply.send(result.rows[0]); // { success: true|false, msg: '...' }
  } catch (err) {
    console.error('Error in DELETE /:name:', err);
    return reply.status(500).send({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// curl -X DELETE http://localhost:3003/PongCup


server.post<{Body: {name?: string; state_run?: boolean;};}>('/init', async (request, reply) => {
  
  const { name, state_run = false } = request.body;
  if (!name)
    return reply.status(400).send({ success: false, msg: 'Missing tournament name' });

  const client = await server.pg.connect();
  try {
    const result = await client.query('SELECT * FROM init_tournament($1::TEXT, $2::BOOLEAN)', [name, state_run]);

    if (result.rows.length === 0)
      return reply.status(500).send({ success: false, msg: 'Empty result from init_tournament' });

    const { success, msg, brackets } = result.rows[0];
    return reply.send({ success, msg, brackets });
  } catch (err) {
    console.error('Error in /init:', err);
    return reply.status(500).send({ success: false, msg: 'Internal server error' });
  } finally {
    client.release();
  }
});



// curl -X POST http://localhost:3003/init 
//   -H "Content-Type: application/json" 
//   -d '{"name": "PongCup"}'


server.put<{
  Params: { id: string };
  Body: { name?: string };
}>('/:id/name', async (request, reply) => {
  const tournamentId = parseInt(request.params.id, 10);
  const { name } = request.body;

  if (isNaN(tournamentId) || !name) {
    return reply.status(400).send({ error: 'Invalid tournament ID or missing name' });
  }

  const client = await server.pg.connect();
  try {
    const result = await client.query(
      'SELECT * FROM set_tournament_name($1::INTEGER, $2::TEXT)',
      [tournamentId, name]
    );

    return reply.send(result.rows[0]);
  } catch (err) {
    console.error('Error in /:id/name:', err);
    return reply.status(500).send({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});



// curl -X PUT http://localhost:3003/1/name 
//   -H "Content-Type: application/json" 
//   -d '{"name": "Champions League"}'

server.put<{
  Params: { id: string };
  Body: { min_players?: number };
}>('/:id/min_players', async (request, reply) => {
  const tournamentId = parseInt(request.params.id, 10);
  const { min_players } = request.body;

  if (isNaN(tournamentId) || typeof min_players !== 'number') {
    return reply.status(400).send({ error: 'Invalid tournament ID or missing/invalid min_players' });
  }

  const client = await server.pg.connect();
  try {
    const result = await client.query(
      'SELECT * FROM set_tournament_min_players($1::INTEGER, $2::INTEGER)',
      [tournamentId, min_players]
    );

    return reply.send(result.rows[0]);
  } catch (err) {
    console.error('Error in /:id/min_players:', err);
    return reply.status(500).send({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});


// curl -X PUT http://localhost:3003/1/min_players 
//   -H "Content-Type: application/json" 
//   -d '{"min_players": 4}'


server.put<{
  Params: { id: string };
  Body: { max_players?: number };
}>('/:id/max_players', async (request, reply) => {
  const tournamentId = parseInt(request.params.id, 10);
  const { max_players } = request.body;

  if (isNaN(tournamentId) || typeof max_players !== 'number') {
    return reply.status(400).send({ error: 'Invalid tournament ID or missing/invalid max_players' });
  }

  const client = await server.pg.connect();
  try {
    const result = await client.query(
      'SELECT * FROM set_tournament_max_players($1::INTEGER, $2::INTEGER)',
      [tournamentId, max_players]
    );

    return reply.send(result.rows[0]);
  } catch (err) {
    console.error('Error in /:id/max_players:', err);
    return reply.status(500).send({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});


// curl -X PUT http://localhost:3003/1/max_players 
//   -H "Content-Type: application/json" 
//   -d '{"max_players": 16}'


server.get<{ Querystring: { id: number } }>('/game/state',async (request, reply) => {
    
  const { id } = request.query;
    if (!id || isNaN(id))
      return reply
        .status(400)
        .send({ success: false, msg: 'Missing or invalid id', gstate: null });

    const client = await server.pg.connect();
    try {
      const res = await client.query('SELECT * FROM get_game_state($1::INTEGER);',[id]);

      if (res.rows.length === 0)
        return reply
          .status(404)
          .send({ success: false, msg: 'No result', gstate: null });

      return reply.send(res.rows[0]); // { success, msg, gstate }
    } catch (err) {
      console.error('Error in /game/state:', err);
      return reply
        .status(500)
        .send({ success: false, msg: 'Internal error', gstate: null });
    } finally {
      client.release();
    }
  }
);

// curl "http://localhost:3003/game/state?id=2"

server.post<{
  Body: {
    gameId: number;
    winnerId: number;
    p1_score: number;
    p2_score: number;
  };
}>('/game/end', async (request, reply) => {
  const { gameId, winnerId, p1_score, p2_score } = request.body;

  if (!gameId || !winnerId || p1_score === undefined || p2_score === undefined) {
    return reply.status(400).send({ success: false, msg: 'Missing required game data.' });
  }

  const client = await server.pg.connect();
  try {
    // Get tournament_id and p1_id to determine winner boolean
    const gameQuery = await client.query('SELECT tournament_id, p1_id FROM games WHERE id = $1', [gameId]);
    if (gameQuery.rows.length === 0) {
      return reply.status(404).send({ success: false, msg: 'Game not found.' });
    }
    const { tournament_id, p1_id } = gameQuery.rows[0];

    // 1. Update the game state
    await client.query(
      `UPDATE games SET state = 'OVER', winner = ($1 = $2), p1_score = $3, p2_score = $4 WHERE id = $5`,
      [winnerId, p1_id, p1_score, p2_score, gameId]
    );

    // 2. Try to advance the tournament
    await client.query(`SELECT * FROM next_round($1::INTEGER)`, [tournament_id]);

    // 3. Check if the tournament is now over
    const tournamentStatus = await client.query('SELECT state, winner_id FROM tournaments WHERE id = $1', [tournament_id]);
    if (tournamentStatus.rows[0].state === 'OVER') {
        const winnerRes = await client.query('SELECT name, tag FROM users WHERE id = $1', [tournamentStatus.rows[0].winner_id]);
        const winner = winnerRes.rows[0];
        const message = JSON.stringify({
            type: 'tournament-winner',
            winner: winner,
        });
        const connections = tournamentConnections.get(tournament_id);
        if (connections) {
            for (const connection of connections) {
                connection.send(message);
            }
        }
    } else {
        // 4. Notify clients via WebSocket that the bracket has been updated
        const connections = tournamentConnections.get(tournament_id);
        if (connections) {
          const message = JSON.stringify({ type: 'bracket_update' });
          for (const connection of connections) {
            connection.send(message);
          }
        }
    }

    return reply.send({ success: true, msg: 'Tournament updated successfully.' });
  } catch (err) {
    console.error('Error in /game/end:', err);
    return reply.status(500).send({ success: false, msg: 'Internal server error' });
  } finally {
    client.release();
  }
});

server.get<{ Params: { id: string } }>('/:id/running_matches', async (request, reply) => {
  const tournamentId = parseInt(request.params.id, 10);
  if (isNaN(tournamentId)) {
    return reply.status(400).send({ error: 'Invalid tournament ID' });
  }

  const client = await server.pg.connect();
  try {
    // Call the existing get_brackets function
    const result = await client.query(
      'SELECT * FROM get_brackets($1::INTEGER)',
      [tournamentId]
    );

    if (result.rows.length === 0 || !result.rows[0].success) {
      return reply.status(404).send({ error: 'Tournament not found or failed to get brackets' });
    }

    const bracketData = result.rows[0];
    const runningMatches = [];

    if (bracketData.brackets && Array.isArray(bracketData.brackets)) {
      for (const round of bracketData.brackets) {
        // Handle the typo in the backend by checking for both keys
        const matches = round.matches || round.matchs;
        if (matches && Array.isArray(matches)) {
          for (const match of matches) {
            if (match.state === 'RUNNING') {
              runningMatches.push(match);
            }
          }
        }
      }
    }

    return reply.send(runningMatches);
  } catch (err) {
    console.error('Error in /:id/running_matches:', err);
    return reply.status(500).send({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

