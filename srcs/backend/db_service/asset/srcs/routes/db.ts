import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export default async function dbRoutes(app: FastifyInstance) {
  // Health check endpoint
  app.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
    // TODO: implement actual DB connectivity check
    return reply.send({ ok: true, message: 'DB service is healthy' });
  });
}