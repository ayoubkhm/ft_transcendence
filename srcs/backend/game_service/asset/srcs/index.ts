import fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from 'fastify-cors'
import fastifyPlugin from 'fastify-plugin'

// OAuth2 (Google) plugin is now auto-loaded via services/oauth/routes
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import gameRoutes from './routes/game.js'

// Polyfill __dirname in ES module scope
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const app = fastify({ logger: true })
// Register CORS plugin with compatibility for Fastify v5
app.register(
  fastifyPlugin(cors, { fastify: '5.x' })
)
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
  app.log.info(`Game service ready on http://${host}:${port}`);
});
