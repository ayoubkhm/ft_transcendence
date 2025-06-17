import Fastify from 'fastify'
import autoload from 'fastify-autoload'
import cors from 'fastify-cors'
import fastifyPlugin from 'fastify-plugin'
// OAuth2 (Google) plugin is now auto-loaded via services/oauth/routes
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

// Polyfill __dirname in ES module scope
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const app = Fastify({ logger: true })
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

// Autoload solo-game routes from service folder
app.register(autoload, {
  dir: join(__dirname, 'services', 'game', 'routes'),
  forceESM: true,
  scriptPattern: /\.ts$/,
  options: { prefix: '/api' }
})
// Autoload other routes (login, ping) from 'routes'
app.register(autoload, {
  dir: join(__dirname, 'routes'),
  forceESM: true,
  scriptPattern: /\.ts$/,
  options: { prefix: '/api' }
})
// Autoload OAuth2 (Google) routes and plugin
app.register(autoload, {
  dir: join(__dirname, 'services', 'oauth', 'routes'),
  forceESM: true,
  scriptPattern: /\.ts$/,
  options: { prefix: '/api/auth' }
})

export default app
