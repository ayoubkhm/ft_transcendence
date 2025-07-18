import Fastify from 'fastify';
import FastifyPostgres from '@fastify/postgres';
import fastifyWebsocket from '@fastify/websocket';
import 'dotenv/config';

import bracketsRoute from './brackets';
import httpRoutes from './routes/index';
import websocketRoutes from './websocket';

const server = Fastify();

// --- Plugin Registration ---
server.register(FastifyPostgres, { connectionString: process.env.DATABASE_URL });
server.register(fastifyWebsocket);

// --- Route Registration ---
server.register(bracketsRoute, { prefix: '/api/tournaments' });
server.register(httpRoutes, { prefix: '/api/tournaments' });
server.register(websocketRoutes);


// --- Server Start ---
server.listen({ port: 3000, host: '0.0.0.0' })
  .then((address) => {
    console.log(`🚀 Tournament service listening at ${address}`);
  })
  .catch((err) => {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  });