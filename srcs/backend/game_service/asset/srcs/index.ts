import fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from 'fastify-cors'
import fastifyPlugin from 'fastify-plugin'
import fastifyWebsocket from '@fastify/websocket'

// OAuth2 (Google) plugin is now auto-loaded via services/oauth/routes
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
// Import without extension to allow ts-node (dev) and compiled JS (prod) resolution
// Import with .ts extension so ts-node/esm can resolve the TypeScript source
import gameRoutes from './routes/game.ts'

// Polyfill __dirname in ES module scope
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
// Trust proxy headers for protocol when behind SSL termination (e.g., Nginx)
const app = fastify({ logger: true, trustProxy: true })
// Register CORS plugin with compatibility for Fastify v5
app.register(
  fastifyPlugin(cors, { fastify: '5.x' })
)
// WebSocket plugin (for real-time game updates)
app.register(fastifyWebsocket)

// OAuth2 (Google) plugin registration moved to autoload below
// Simple in-memory metrics
const metrics = {
  totalRequests: 0,
  cookiesCount: 0,
  requestsPerRoute: {} as Record<string, number>
}

// Count cookies on each incoming request
app.addHook('onRequest', async (request) => {
  const raw = request.headers.cookie || ''
  const count = raw ? raw.split(';').length : 0
  metrics.cookiesCount += count
})

// Count total requests and per-route counts after response is sent
app.addHook('onResponse', async (request, reply) => {
  metrics.totalRequests += 1
  const route = (request as any).routerPath || request.url || ''
  metrics.requestsPerRoute[route] = (metrics.requestsPerRoute[route] || 0) + 1
})

// Expose metrics endpoint (JSON)
app.get('/metrics', async (_req, reply) => metrics)

// Autoload game routes
app.register(gameRoutes, { prefix: '/api' })

// Listen on configured port/host (default to 3001)
const port = parseInt(process.env.PORT || '3001', 10);
const host = process.env.HOST || '0.0.0.0';
app.listen({ port, host }, err => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  // Log service availability with correct protocol per environment
  const scheme = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  app.log.info(`Game service ready on ${scheme}://${host}:${port}`);
});
