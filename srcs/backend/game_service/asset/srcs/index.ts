console.log('CACA BOUDIN');
import 'dotenv/config';
import fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyWebsocket from '@fastify/websocket';
import FastifyPostgres from '@fastify/postgres';
import gameRoutes from './routes/game.js';

const app = fastify({ logger: true, trustProxy: true });

// Register essential plugins
app.register(cors);
app.register(fastifyWebsocket);
app.register(FastifyPostgres, { connectionString: process.env.DATABASE_URL });

// Simple in-memory metrics (can be kept or removed)
const metrics = {
  totalRequests: 0,
  cookiesCount: 0,
  requestsPerRoute: {} as Record<string, number>
};
app.addHook('onRequest', async (request) => {
  const raw = request.headers.cookie || '';
  const count = raw ? raw.split(';').length : 0;
  metrics.cookiesCount += count;
});
app.addHook('onResponse', async (request, reply) => {
  metrics.totalRequests += 1;
  const route = (request as any).routerPath || request.url || '';
  metrics.requestsPerRoute[route] = (metrics.requestsPerRoute[route] || 0) + 1;
});
app.get('/metrics', async (_req, reply) => metrics);

// Autoload game routes
console.log('TYPE gameRoutes =', typeof gameRoutes, gameRoutes);
app.register(gameRoutes, { prefix: '/api' });

// Start server
const port = parseInt(process.env.PORT || '3001', 10);
const host = process.env.HOST || '0.0.0.0';
app.listen({ port, host }, err => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  const scheme = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  app.log.info(`Game service ready on ${scheme}://${host}:${port}`);
});
