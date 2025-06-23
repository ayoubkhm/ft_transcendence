import fastify from 'fastify';
import cors from 'fastify-cors';
import fastifyPlugin from 'fastify-plugin';
import dbRoutes from './routes/db.js';

// Initialize Fastify app
const app = fastify({ logger: true });

// Register CORS plugin for Fastify v5 compatibility
app.register(fastifyPlugin(cors, { fastify: '5.x' }));

// Register DB service routes under /api/db
app.register(dbRoutes, { prefix: '/api/db' });

// Simple metrics endpoint
app.get('/metrics', async (_req, _reply) => ({
  service: 'db_service',
  uptime: process.uptime()
}));

// Start the server
const port = parseInt(process.env.PORT || '3002', 10);
const host = process.env.HOST || '0.0.0.0';
app.listen({ port, host }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`DB service ready on http://${host}:${port}`);
});