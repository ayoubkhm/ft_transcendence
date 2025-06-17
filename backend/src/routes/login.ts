import { FastifyInstance } from 'fastify'

interface LoginBody {
  email: string;
  password: string;
}

export default async function loginRoutes (app: FastifyInstance) {
  app.get<{ Body: LoginBody }>('/login', async (request, reply) => {
    const { email, password } = request.body;

    if (
      !email ||
      !password ||
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
    ) {
      return reply.status(400).send({ error: 'Invalid email or password' });
    }
  });
}

