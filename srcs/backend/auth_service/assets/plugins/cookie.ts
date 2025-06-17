import { FastifyInstance } from 'fastify';
import cookiesPlugin from '@fastify/cookie';

export default function registerCookie(app: FastifyInstance) {
  app.register(cookiesPlugin, {
    secret: process.env.COOKIE_SECRET!,
    parseOptions: { httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 7 }
  });
}
