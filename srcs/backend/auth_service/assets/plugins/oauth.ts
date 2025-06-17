import { FastifyInstance } from 'fastify';
import oauthPlugin from '@fastify/oauth2';

export default function registerOAuth(app: FastifyInstance) {
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
    startRedirectPath: '/api/auth/login/google',
    callbackUri:       process.env.CALLBACK_URL!
  });
}
