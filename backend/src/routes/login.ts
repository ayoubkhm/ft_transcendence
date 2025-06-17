import { FastifyInstance } from 'fastify'

// Define the shape of the expected request body
interface LoginBody {
  email: string
  password: string
}

// Login route: basic email/password validation
export default async function (app: FastifyInstance)
{
  app.post<{ Body: LoginBody }>('/login', async (request, reply) => {
    const { email, password } = request.body

    if (
      !email ||
      !password ||
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
    ) {
      return reply.status(400).send({ error: 'Invalid email or password' })
    }

    // Credentials look valid
    return { ok: true }
  })
}