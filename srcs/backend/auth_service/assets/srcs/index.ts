import fastify, { FastifyRequest, FastifyReply } from 'fastify';
import oauthPlugin, { OAuth2Namespace } from '@fastify/oauth2';
import cookiesPlugin from '@fastify/cookie';
import jwt from 'jsonwebtoken';
import 'dotenv/config';
import authRoutes from './routes/auth';

declare module 'fastify' {
  interface FastifyInstance {
    googleOAuth2: OAuth2Namespace;
  }
}

const app = fastify({ logger: true });


// Si tu es en production, utilise HTTPS et mets secure à true
// Sinon, en développement, mets secure à false (HTTP)
// —–– 1) Cookie plugin (pour ton setCookie dans le callback)
app.register(cookiesPlugin, {});
// JWT-based authentication decorator: validates session cookie and populates request.user
app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const token = (request.cookies as Record<string,string>).session;
    if (!token) throw new Error('No session token');
    const payload = jwt.verify(token, process.env.JWT_SECRET!);
    (request as any).user = payload;
  } catch (err) {
    reply.code(401).send({ error: 'Not authenticated' });
  }
});
// Determine callbackUri: use env var if set, otherwise build dynamically per request
const callbackUri = process.env.CALLBACK_URL 
  ?? 'http://localhost:3000/api/auth/login/google/callback'; 
console.log('🔔 callbackUri =', callbackUri);

console.log('🔐 GOOGLE_CLIENT_ID =', process.env.GOOGLE_CLIENT_ID)
console.log('🔔 CALLBACK_URL     =', process.env.CALLBACK_URL)



app.register(oauthPlugin, {
  name: 'googleOAuth2',
  scope: ['profile', 'email'],
  credentials: {
    client: {
      id: process.env.GOOGLE_CLIENT_ID,
      secret: process.env.GOOGLE_CLIENT_SECRET
    },
  },
  cookie: {
    secure:   true,
    sameSite: 'lax',
    path:     '/'
  },
  startRedirectPath: '/api/auth/login/google',
  callbackUri,
  discovery: {
    issuer: 'https://accounts.google.com'
  },
  useDiscovery: true,
})

// —–– 3) Tes routes custom (le callback)
app.register(authRoutes, { prefix: '/api/auth' });

// —–– 4) Démarrage
app.listen({ host: '0.0.0.0', port: 3000 }, err => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info('Auth service ready');
});
