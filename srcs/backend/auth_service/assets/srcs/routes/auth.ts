// src/routes/auth.ts
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export default async function authRoutes(app: FastifyInstance) {
  // callback Google OAuth2
  app.get('/google/callback', async (req: FastifyRequest, reply: FastifyReply) => {
    // 1) Exchange code → AccessToken object
    const oauthResult = await app.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(req);
    // 2) Récupère la vraie chaîne d’accès
    const accessToken = oauthResult.token.access_token;

    // 3) Signe le cookie et renvoie la réponse JSON
    reply
      .setCookie('session', accessToken, {
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 7,     // 7 jours
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      })
      .send({
        ok:    true,
        token: accessToken
      });
  });
    interface LoginBody {
    email: string;
    password: string;
  }
    app.post<{ Body: LoginBody }>('/login', async (request, reply) => {
    const { email, password } = request.body;

    if (
      !email ||
      !password ||
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
    ) {
      return reply.status(400).send({ error: 'Invalid email or password' });
    }

    // ici tu peux comparer contre ta base, bcrypt, etc.
    return { ok: true };
  });
}
