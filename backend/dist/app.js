import Fastify from 'fastify';
import autoload from 'fastify-autoload';
import cors from 'fastify-cors';
import fastifyPlugin from 'fastify-plugin';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
// Polyfill __dirname in ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = Fastify({ logger: true });
// Register CORS plugin with compatibility for Fastify v5
app.register(fastifyPlugin(cors, { fastify: '5.x' }));
// Simple in-memory metrics
const metrics = {
    totalRequests: 0,
    cookiesCount: 0,
    requestsPerRoute: {}
};
// Count cookies on each incoming request
app.addHook('onRequest', async (request) => {
    const raw = request.headers.cookie || '';
    const count = raw ? raw.split(';').length : 0;
    metrics.cookiesCount += count;
});
// Count total requests and per-route counts after response is sent
app.addHook('onResponse', async (request, reply) => {
    metrics.totalRequests += 1;
    const route = request.routerPath || request.url || '';
    metrics.requestsPerRoute[route] = (metrics.requestsPerRoute[route] || 0) + 1;
});
// Expose metrics endpoint (JSON)
app.get('/metrics', async (_req, reply) => metrics);
// Autoload routes from the 'routes' directory with '/api' prefix
app.register(autoload, {
    dir: join(__dirname, 'routes'),
    options: { prefix: '/api' }
});
export default app;
