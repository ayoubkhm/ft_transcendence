import fastify, { FastifyRequest, FastifyReply } from 'fastify';
import oauthPlugin, { OAuth2Namespace } from '@fastify/oauth2';
import cookiesPlugin from '@fastify/cookie';
import jwt from 'jsonwebtoken';
import 'dotenv/config';
import authRoutes from './routes/auth';
import dfaRoutes from './routes/2FA';
import passwordResetRoutes from './routes/passwordReset';

declare module 'fastify' {
  interface FastifyInstance {
    googleOAuth2: OAuth2Namespace;
  }
}

// Trust proxy headers (X-Forwarded-Proto) when behind SSL termination (e.g., Nginx)
const app = fastify({ logger: true, trustProxy: true });


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
// Determine OAuth2 callback URI; default to localhost with correct protocol per environment
const callbackUri = process.env.CALLBACK_URL 
  ?? `${process.env.NODE_ENV === 'production' ? 'https' : 'http'}://localhost:3000/api/auth/login/google/callback`;
console.log('TEST =',process.env.NODE_ENV === 'production' ? 'https' : 'http')
console.log('🔔 callbackUri =', callbackUri)
console.log('🔔 mode =', process.env.NODE_ENV)
console.log('🔐 secure =', process.env.NODE_ENV === 'production')
console.log('🔐 GOOGLE_CLIENT_ID =', process.env.GOOGLE_CLIENT_ID)
console.log('🔔 CALLBACK_URL     =', process.env.CALLBACK_URL)
console.log('🔐 JWT_SECRET    =', process.env.JWT_SECRET)


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
    secure:   process.env.NODE_ENV === 'prod',
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
app.register(dfaRoutes, { prefix: '/api/auth/2fa' });
app.register(passwordResetRoutes, { prefix: '/api/auth' });

// —–– 4) Démarrage
async function start() {
  try {
    await initJwt();
    await app.listen({ host: '0.0.0.0', port: 3000 });
    app.log.info('Auth service ready');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
