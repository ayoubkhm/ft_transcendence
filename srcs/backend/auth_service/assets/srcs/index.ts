import fastify, { FastifyRequest, FastifyReply } from 'fastify';
import oauthPlugin, { OAuth2Namespace } from '@fastify/oauth2';
import cookiesPlugin from '@fastify/cookie';
import jwt from 'jsonwebtoken';
import 'dotenv/config';
import authRoutes from './routes/auth';
import dfaRoutes from './routes/2FA';
import changePasswordRoutes from './routes/changePassword';
import { initJwt } from './JWT/jsonwebtoken';

declare module 'fastify' {
  interface FastifyInstance {
    googleOAuth2: OAuth2Namespace;
  }
}

const app = fastify({ logger: true, trustProxy: true });
app.register(cookiesPlugin, {});
const callbackUri = process.env.CALLBACK_URL 
  ?? `${process.env.NODE_ENV === 'production' ? 'https' : 'http'}://localhost:3000/api/auth/login/google/callback`;


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
//+route for changing password
app.register(changePasswordRoutes, { prefix: '/api/auth' });


// —–– 4) Démarrage
initJwt(); // Initialize JWT with secret
app.listen({ host: '0.0.0.0', port: 3000 }, (err, address) =>
{
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(`ready`);
})