import fastify, { FastifyRequest, FastifyReply } from 'fastify';
import oauthPlugin, { OAuth2Namespace } from '@fastify/oauth2';
import cookiesPlugin from '@fastify/cookie';
import 'dotenv/config';
import authRoutes from './routes/auth';
import loginRoutes from './routes/login';
import registerCookie from './plugins/cookie';
import registerOAuth from './plugins/oauth';

declare module 'fastify' {
  interface FastifyInstance {
    googleOAuth2: OAuth2Namespace;
  }
}

const app = fastify({ logger: true });

// —–– 1) Cookie plugin (pour ton setCookie dans le callback)
registerCookie(app);

app.register(loginRoutes, { prefix: '/api/auth' });
registerOAuth(app);


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
