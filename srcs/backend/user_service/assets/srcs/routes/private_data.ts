import { FastifyInstance } from "fastify";
import  validateUserData from "../utils/userData";

export default async function private_userRoutes(server: FastifyInstance, options: any, done: any) {
        
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
      result = await server.pg.query(`SELECT * FROM users WHERE email = $1`, [value]);
    } else if (isID) {
      result = await server.pg.query(`SELECT * FROM users WHERE id = $1`, [Number(value)]);
    } else {
      result = await server.pg.query(`SELECT * FROM users WHERE name = $1`, [value]);
    }

    if (!result || result.rows.length === 0) {
      return reply.status(404).send({ error: 'User not found' });
    }
    console.log('[LOOKUP] Utilisateur trouvé :', result.rows[0]);
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
      provider?: string,
      credential: string,
      isAdmin?: boolean,
      type?: string
    }

  server.post<{ Body: DataUserParams }>('/create', { preHandler: [validateUserData] }, async (request, reply) => {
        const email = request.body.email;
        const name = request.body.name;
        const password = request.body.password;
        const type = request.body.type;
        const isAdmin = request.body.isAdmin;
        const provider = request.body.provider;
        console.log("data::", email, name, password);
        
        // Simulate creating user data
  try {
    const result = await server.pg.query('SELECT * FROM new_user($1, $2, $3, $4)', [name, type, email, password]);
    console.log('[CREATE] New user created:', result.rows[0]);
    return reply.send({
      message: 'User created successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Insert user error:', error);
    return reply.status(500).send({ error: 'Internal server error' });
  }
    });

  server.put<{ Body: DataUserParams }>('/2fa/update/:id', async (request, reply) => {
  });
  done();
}