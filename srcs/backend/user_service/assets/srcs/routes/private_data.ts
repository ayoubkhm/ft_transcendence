import { FastifyInstance } from "fastify";

export default async function private_userRoutes(server: FastifyInstance) {
        
    interface PrivateDataParams {
      email: string;
    }

    interface PrivateDataBody {
      credential: string;
    }

    server.post<{ Params: PrivateDataParams, Body: PrivateDataBody }>('/lookup/:email', async (request, reply) => {
  const value = request.params.email;

  const isEmail = value.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/);
  const isID = value.match(/^[0-9]$/);

  try {

    let result;
    if (isEmail) {
      result = await server.pg.query(`SELECT * FROM "User" WHERE email = $1`, [value]);
    } else if (isID) {
      result = await server.pg.query(`SELECT * FROM "User" WHERE id = $1`, [Number(value)]);
    } else {
      result = await server.pg.query(`SELECT * FROM "User" WHERE name = $1`, [value]);
    }

    if (!result || result.rows.length === 0) {
      return reply.status(404).send({ error: 'User not found' });
    }

    return reply.send(result.rows[0]);

  } catch (error) {
    console.error('Raw query error:', error);
    return reply.status(500).send({ error: 'Internal server error' });
  }
});

    interface DataUserParams {
      email: string,
      name: string,
      password?: string;
      credential: string,
      isAdmin?: boolean,}

    server.post<{ Body: DataUserParams }>('/create', async (request, reply) => {
        const email = request.body.email;
        const name = request.body.name;
        const password = request.body.password;
        const isAdmin = request.body.isAdmin;
        // Simulate creating user data
  try {
    const result = await server.pg.query(
      `INSERT INTO "User" (email, name, password, "isAdmin")
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [email, name, password || null, isAdmin || false]
    );

    return reply.send({
      message: 'User created successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Insert user error:', error);
    return reply.status(500).send({ error: 'Internal server error' });
  }
    });
}