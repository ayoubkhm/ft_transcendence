import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Pool } from 'pg';

const pool = new Pool();
// Plugin function for Fastify; accepts instance and options
export default async function dbRoutes(app: FastifyInstance, opts: any) {
  // Health check endpoint
  app.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
    // TODO: implement actual DB connectivity check
    try {
      await pool.query('SELECT 1');
      return reply.send({ ok: true, message: 'DB service is healthy' });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ ok: false, message: 'Database unavailable' });
    }
  });
  
  // Create new user
  interface CreateUserBody {
    email: string;
    password: string;
    name: string;
    credential?: string;
  }
  app.post<{ Body: CreateUserBody }>('/users/create', async (req, reply) => {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return reply.status(400).send({ error: 'Missing fields' });
    }
    const client = await pool.connect();
    try {
      const resUser = await client.query(
        'INSERT INTO users(name) VALUES($1) RETURNING id',
        [name]
      );
      const id = resUser.rows[0].id;
      await client.query(
        'INSERT INTO "signed-users"(id, name, username, password) VALUES($1, $2, $3, $4)',
        [id, name, email, password]
      );
      return reply.send({ id, name, email, isTowFAEnabled: false, isAdmin: false, towfactorsecret: null, password });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'User creation failed' });
    } finally {
      client.release();
    }
  });
  
  // Lookup existing user
  interface LookupParams { email: string; }
  app.post<{ Params: LookupParams }>('/users/lookup/:email', async (req, reply) => {
    const { email } = req.params;
    if (!email) {
      return reply.status(400).send({ error: 'Missing email' });
    }
    const client = await pool.connect();
    try {
      const res = await client.query(
        'SELECT u.id, s.name, s.username, s.password FROM users u JOIN "signed-users" s ON u.id = s.id WHERE s.username = $1',
        [email]
      );
      if (res.rowCount === 0) {
        return reply.status(404).send({ error: 'User not found' });
      }
      const row = res.rows[0];
      return reply.send({
        id: row.id,
        name: row.name,
        email: row.username,
        password: row.password,
        isBanned: false,
        isTowFAEnabled: false,
        isAdmin: false,
        towfactorsecret: null
      });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Lookup failed' });
    } finally {
      client.release();
    }
  });
}