import fastify from 'fastify'
import oauthPlugin from '@fastify/oauth2';
import cookiesPlugin from '@fastify/cookie';
import { OAuth2Namespace } from '@fastify/oauth2';
import { FastifyRequest, FastifyReply } from 'fastify';
import { metrics, auth_requests_total } from "./metrics";

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
    //code pour oauth https://github.com/fastify/fastify-oauth2
});

server.listen({ host: '0.0.0.0', port: 3000 }, (err) =>
{
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(`ready`);
})