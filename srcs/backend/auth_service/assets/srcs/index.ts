import fastify, { FastifyRequest, FastifyReply } from 'fastify';
import oauthPlugin, { OAuth2Namespace } from '@fastify/oauth2';
import cookiesPlugin from '@fastify/cookie';
import 'dotenv/config';
import authRoutes from './routes/auth';
import dfaRoutes from './routes/2FA';

declare module 'fastify' {
  interface FastifyInstance {
    googleOAuth2: OAuth2Namespace;
  }
}

const app = fastify({ logger: true });

const cookieSecure = process.env.NODE_ENV === 'production';
// Si tu es en production, utilise HTTPS et mets secure à true
// Sinon, en développement, mets secure à false (HTTP)
// —–– 1) Cookie plugin (pour ton setCookie dans le callback)
app.register(cookiesPlugin, {});
app.register(oauthPlugin, {
    name: 'googleOAuth2',
    scope: ['profile','email'],
    credentials: {
      client: {
        id:     process.env.GOOGLE_CLIENT_ID!,
        secret: process.env.GOOGLE_CLIENT_SECRET!
      },
      auth: oauthPlugin.GOOGLE_CONFIGURATION
    },
    cookie: {
      secure: cookieSecure, // true si HTTPS, false si HTTP
      sameSite: 'lax'
    },
    startRedirectPath: '/api/auth/login/google',
    callbackUri: process.env.CALLBACK_URL!
});


// —–– 3) Tes routes custom (le callback)
app.register(authRoutes, { prefix: '/api/auth' });
app.register(dfaRoutes, { prefix: '/api/auth'})

// —–– 4) Démarrage
app.listen({ host: '0.0.0.0', port: 3000 }, err => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info('Auth service ready');
});
