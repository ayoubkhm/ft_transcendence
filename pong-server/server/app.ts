import Fastify, { FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import { resolve } from 'path';

/**
 * Create & configure the Fastify HTTP server.
 * - Enables logging
 * - Serves static files from ../pong-client
 */
export function buildApp(): FastifyInstance {
  const app: FastifyInstance = Fastify({ logger: true });
  const staticRoot = resolve(process.cwd(), '../pong-client');
  app.register(fastifyStatic, { root: staticRoot, prefix: '/' });
  return app;
}
