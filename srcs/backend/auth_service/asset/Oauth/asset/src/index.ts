import fastify from 'fastify'
import oauthPlugin from '@fastify/oauth2';
import cookiesPlugin from '@fastify/cookie';
import { OAuth2Namespace } from '@fastify/oauth2';
import { FastifyRequest, FastifyReply } from 'fastify';

const server = fastify();

declare module 'fastify'
{
  interface FastifyInstance
  {
    googleOAuth2: OAuth2Namespace;
  }
}

server.register(cookiesPlugin, {});
//server.register pour metrics routes etc
server.register(oauthPlugin, {
    name: 'googleOAuth2',
  scope: ['profile', 'email'],
  credentials: {
    client: {
      id: '<CLIENT_ID>',
      secret: '<CLIENT_SECRET>',
    },
    auth: oauthPlugin.GOOGLE_CONFIGURATION,
  },
  startRedirectPath: '/api/auth/login/google',
  callbackUri: 'http://localhost:3000/login/google/callback',
  discovery: {
    issuer: 'https://accounts.google.com'
  },
  generateStateFunction: (request: FastifyRequest, reply: FastifyReply) => {
    return request.query.state
  },
  checkStateFunction: (request: FastifyRequest, callback: any) => {
      // @ts-ignore
      if (request.query.state) {
          callback()
          return;
      }
      callback(new Error('Invalid state'))
  }
})

server.listen({ host: '0.0.0.0', port: 3000 }, (err) =>
{
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(`ready`);
})