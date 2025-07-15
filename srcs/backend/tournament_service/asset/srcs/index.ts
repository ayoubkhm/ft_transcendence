import Fastify from 'fastify';
import FastifyPostgres from '@fastify/postgres';
import 'dotenv/config';
import bracketsRoute from './brackets'

const server = Fastify();

// Trust proxy headers (e.g., X-Forwarded-Proto) when behind SSL termination

// ─── Plugin PostgreSQL ──────────────────────────────────────
server.register(FastifyPostgres, {
  connectionString: process.env.DATABASE_URL,
});
server.register(bracketsRoute, { prefix: '/api/tournaments' });

// Allow GET for join via query param: GET /api/tournament/:id/join?user_id=xxx
server.get<{
  Params: { id: string };
  Querystring: { user_id?: string };
}>('/api/tournament/:id/join', async (request, reply) => {
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
    console.error('Error in GET /api/tournament/:id/join:', err);
    return reply.status(500).send({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});
// ─── Lancement du serveur ───────────────────────────────────
server.listen({ port: 3000, host: '0.0.0.0' })
  .then((address) => {
    console.log(`🚀 Tournament service listening at ${address}`);
  })
  .catch((err) => {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  });



  server.post('/api/tournament', async (request, reply) => {
  const body = request.body as { name?: string;};

  if (!body.name) {
    return reply.status(400).send({ error: 'Missing name' });
  }

  const client = await server.pg.connect();
  try {
      const result = await client.query(
        'SELECT * FROM new_tournament($1::TEXT)',
        [body.name]
      );
    if (result.rows.length === 0) {
      return reply.status(500).send({ error: 'Tournament creation failed' });
    }

    return reply.send(result.rows[0]);
  } catch (err) {
    console.error('Error in /api/tournament:', err);
    return reply.status(500).send({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

//  curl -X POST http://localhost:3003/api/tournament \
//   -H "Content-Type: application/json" \
//   -d '{"name": "TestTournament1", "max_players": 8}'


server.post<{
  Params: { id: string };
  Body: { user_id?: number };
}>('/api/tournament/:id/join', async (request, reply) => {
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
    console.error('Error in /api/tournament/:id/join:', err);
    return reply.status(500).send({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// curl -X POST http://localhost:3003/api/tournament/1/join \
//   -H "Content-Type: application/json" \
//   -d '{"user_id": 1}'


server.get('/api/tournaments/tournaments', async (request, reply) => {
  const client = await server.pg.connect();
  try {
    const result = await client.query('SELECT id, state, name, min_players, max_players, nbr_players, owner_id FROM tournaments');
    return reply.send(result.rows);  // ← rows = tableau d'objets JS
  } catch (err) {
    console.error('Error in /api/tournaments/tournaments:', err);
    return reply.status(500).send({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// curl http://localhost:3003/api/alltournaments

server.get('/api/allusers', async (request, reply) => {
  const client = await server.pg.connect();
  try {
    const result = await client.query('SELECT * FROM users');
    return reply.send(result.rows);  // ← rows = tableau d'objets JS
  } catch (err) {
    console.error('Error in /api/allusers:', err);
    return reply.status(500).send({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});


// curl http://localhost:3003/api/allusers

server.get<{Params: { id: string };}>('/api/allusersfromtournament/:id', async (request, reply) => {
  const tournamentId = parseInt(request.params.id, 10);
  const client = await server.pg.connect();
  try {
    const result = await client.query('SELECT u.* FROM users u JOIN tournaments_players tp ON u.id = tp.player_id WHERE tp.tournament_id = $1', [tournamentId]);
    return reply.send(result.rows);  // ← rows = tableau d'objets JS
  } catch (err) {
    console.error('Error in /api/allusersfromtournament/:id', err);
    return reply.status(500).send({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// curl http://localhost:3003/api/allusersfromtournament/1

server.get<{Params: { id: string };}>('/api/tournaments/tournaments/:id', async (request, reply) => {
  
  const tournamentId = parseInt(request.params.id, 10);
  if (isNaN(tournamentId))
    return reply.status(400).send({ error: 'Invalid tournament ID' });
  const client = await server.pg.connect();
  try {
    const result = await client.query('SELECT id, state, name, nbr_players, owner_id FROM tournaments WHERE id = $1',[tournamentId]);
    if (result.rows.length === 0)
      return reply.status(404).send({ error: 'Tournament not found' });
    return reply.send(result.rows[0]); // ← renvoie un objet (pas un tableau)
  } catch (err) {
    console.error('Error in /api/tournaments/tournaments/:id', err);
    return reply.status(500).send({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// curl http://localhost:3003/api/atournament/1

server.post<{
  Params: { id: string };
  Body: { name?: string };
}>('/api/tournament/:id/leave', async (request, reply) => {
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
    console.error('Error in /api/tournament/:id/leave:', err);
    return reply.status(500).send({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// curl -X POST http://localhost:3003/api/tournament/1/leave \
//   -H "Content-Type: application/json" \
//   -d '{"name": "ouais"}'

server.post<{ Params: { name: string } }>(
  '/api/tournament/:name/start',
  async (request, reply) => {
    const { name } = request.params;

    if (!name) {
      return reply.status(400).send({ success: false, msg: 'Missing tournament name' });
    }

    const client = await server.pg.connect();
    try {
      const result = await client.query(
        'SELECT * FROM start_tournament($1::TEXT)',
        [name]
      );

      if (result.rows.length === 0) {
        return reply.status(500).send({ success: false, msg: 'Start tournament failed' });
      }

      return reply.send(result.rows[0]); // { success: true/false, msg: string }
    } catch (err) {
      console.error('Error in /api/tournament/:name/start:', err);
      return reply.status(500).send({ success: false, msg: 'Internal server error' });
    } finally {
      client.release();
    }
  }
);

//  curl -X POST localhost:3003/api/tournament/PongCup/start 

server.delete<{
  Params: { name: string };
}>('/api/tournament/:name', async (request, reply) => {
  const { name } = request.params;

  if (!name) {
    return reply.status(400).send({ error: 'Missing tournament name' });
  }

  const client = await server.pg.connect();
  try {
    const result = await client.query(
      'SELECT * FROM delete_tournament($1::TEXT)',
      [name]
    );

    if (result.rows.length === 0) {
      return reply.status(500).send({ error: 'Unexpected error during deletion' });
    }

    return reply.send(result.rows[0]); // { success: true|false, msg: '...' }
  } catch (err) {
    console.error('Error in DELETE /api/tournament/:name:', err);
    return reply.status(500).send({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// curl -X DELETE http://localhost:3003/api/tournament/PongCup


server.post<{
  Body: { name?: string };
}>('/api/tournament/init', async (request, reply) => {
  const { name } = request.body;

  if (!name) {
    return reply.status(400).send({ error: 'Missing tournament name' });
  }

  const client = await server.pg.connect();
  try {
    const result = await client.query(
      'SELECT * FROM init_tournament($1::TEXT)',
      [name]
    );

    if (result.rows.length === 0) {
      return reply.status(500).send({ error: 'Tournament init failed: empty result' });
    }

    const { success, msg, games_id } = result.rows[0];
    return reply.send({ success, msg, games_id });
  } catch (err) {
    console.error('Error in /api/tournament/init:', err);
    return reply.status(500).send({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});


// curl -X POST http://localhost:3003/api/tournament/init \
//   -H "Content-Type: application/json" \
//   -d '{"name": "PongCup"}'


server.put<{
  Params: { id: string };
  Body: { name?: string };
}>('/api/tournament/:id/name', async (request, reply) => {
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
    console.error('Error in /api/tournament/:id/name:', err);
    return reply.status(500).send({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});



// curl -X PUT http://localhost:3003/api/tournament/1/name \
//   -H "Content-Type: application/json" \
//   -d '{"name": "Champions League"}'

server.put<{
  Params: { id: string };
  Body: { min_players?: number };
}>('/api/tournament/:id/min_players', async (request, reply) => {
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
    console.error('Error in /api/tournament/:id/min_players:', err);
    return reply.status(500).send({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});


// curl -X PUT http://localhost:3003/api/tournament/1/min_players \
//   -H "Content-Type: application/json" \
//   -d '{"min_players": 4}'


server.put<{
  Params: { id: string };
  Body: { max_players?: number };
}>('/api/tournament/:id/max_players', async (request, reply) => {
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
    console.error('Error in /api/tournament/:id/max_players:', err);
    return reply.status(500).send({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});
// ─── Lancement du serveur ───────────────────────────────────
server.listen({ port: 3000, host: '0.0.0.0' })
  .then((address) => {
    console.log(`🚀 Tournament service listening at ${address}`);
  })
  .catch((err) => {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  });


// curl -X PUT http://localhost:3003/api/tournament/1/max_players \
//   -H "Content-Type: application/json" \
//   -d '{"max_players": 16}'
