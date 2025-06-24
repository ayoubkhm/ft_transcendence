import { FastifyInstance } from "fastify";

export default async function private_userRoutes(server: FastifyInstance) {
        
    interface PrivateDataParams {
      email: string;
    }
  
    server.post<{ Params: PrivateDataParams }>('/lookup/:email', async (request, reply) => {
  const value = request.params.email;

  const isEmail = value.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/);
  const isID = value.match(/^\d+$/);

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
      email: string;
      name: string;
      password?: string;
      isAdmin?: boolean;}

    server.post<{ Body: DataUserParams }>('/create', async (request, reply) => {
        const email = request.body.email;
        const name = request.body.name;
        const password = request.body.password;
        const isAdmin = request.body.isAdmin;
        // Simulate creating user data
        if (!email || !name) {
            return reply.status(400).send({ error: 'Email and name are required' });
        }
        // Here you would typically save the user data to a database
        return reply.send({
            message: 'User data created successfully',
            user: {
                email: email,
                name: name,
                isAdmin: isAdmin || false,
                password: password || 'No password provided'
            }
            });
    });
}