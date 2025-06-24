// src/routes/auth.ts
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import 'dotenv/config';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

// Base URL for User service (inside Docker network)
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://user_service:3000';

// SMTP transporter (magic links)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false, // we'll rely on STARTTLS if needed
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Helpers --------------------------------------------------
/** 
 * Build the correct origin (http vs https) depending on environment and headers 
 */
function getBaseUrl(request: FastifyRequest): string {
  const forwarded = request.headers['x-forwarded-proto'];
  // if behind a proxy (nginx), this header will be set
  const proto =
    typeof forwarded === 'string'
      ? forwarded.split(',')[0].trim()
      : (process.env.NODE_ENV === 'production' ? 'https' : 'http');

  return `${proto}://${request.headers.host}`;
}

// Main -----------------------------------------------------
export default async function authRoutes(app: FastifyInstance) {
  // Google OAuth2 callback
  app.get('/login/google/callback', async (req, reply) => {
    const oauthResult =
      await app.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(req);
    const accessToken = oauthResult.token.access_token;

    reply
      .setCookie('session', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'none',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/',
      })
      .send({ ok: true, token: accessToken });
  });

  // Signup
  interface SignupBody {
    email: string;
    password: string;
    name: string;
  }
  app.post<{ Body: SignupBody }>('/signup', async (req, reply) => {
    const { email, password, name } = req.body;
    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      typeof name !== 'string' ||
      !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
    ) {
      return reply.status(400).send({ error: 'Invalid signup data' });
    }

    const hashed = await bcrypt.hash(password, 12);
    const res = await fetch(`${USER_SERVICE_URL}/api/users/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: hashed,
        name,
        credential: process.env.API_CREDENTIAL,
      }),
    });
    const data = await res.json();
    if (res.status !== 200) {
      return reply.status(res.status).send({ error: data.error || 'User creation failed' });
    }

    const token = jwt.sign(
      {
        data: {
          id: data.id,
          email: data.email,
          name: data.name,
          towfactorSecret: data.towfactorsecret,
          dfa: true,
        },
      },
      process.env.JWT_SECRET as string,
      { expiresIn: '24h' }
    );

    reply
      .setCookie('session', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/',
      })
      .send({ response: 'success', need2FA: false });
  });

  // Login
  interface LoginBody {
    email: string;
    password: string;
  }
  app.post<{ Body: LoginBody }>('/login', async (req, reply) => {
    const { email, password } = req.body;
    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
    ) {
      return reply.status(400).send({ error: 'Invalid login data' });
    }

    const res = await fetch(
      `${USER_SERVICE_URL}/api/users/lookup/${encodeURIComponent(email)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          credential: process.env.API_CREDENTIAL,
        }),
      }
    );
    const user = await res.json();
    if (res.status !== 200 || !user.password) {
      return reply.status(401).send({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid email or password' });
    }
    if (user.isBanned) {
      return reply.status(403).send({ error: 'User is banned' });
    }

    // 2FA via magic link
    if (user.isTowFAEnabled) {
      const pendingToken = jwt.sign(
        {
          data: { id: user.id, email, name: user.name, isAdmin: user.isAdmin },
          pendingMagic: true,
        },
        process.env.JWT_SECRET as string,
        { expiresIn: '15m' }
      );

      const baseUrl = getBaseUrl(req);
      const link = `${baseUrl}/login/magic/callback?token=${pendingToken}`;
      await transporter.sendMail({
        to: email,
        subject: 'Your login magic link',
        html: `<p>Hello ${user.name},</p><p>Click <a href="${link}">here</a> to complete login.</p>`,
      });
      return reply.send({ response: 'magic_sent' });
    }

    // Normal login → issue session cookie
    const sessionToken = jwt.sign(
      {
        data: {
          id: user.id,
          email,
          name: user.name,
          isAdmin: user.isAdmin,
          towfactorSecret: user.towfactorsecret,
          dfa: true,
        },
      },
      process.env.JWT_SECRET as string,
      { expiresIn: '24h' }
    );

    reply
      .setCookie('session', sessionToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/',
      })
      .send({ response: 'success', need2FA: false });
  });

  // Magic link callback
  app.get('/login/magic/callback', async (req, reply) => {
    const token = (req.query as any).token as string | undefined;
    if (!token) {
      return reply.status(400).send({ error: 'Missing token' });
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET as string) as any;
      if (!payload.pendingMagic) {
        return reply.status(403).send({ error: 'Invalid or expired magic link' });
      }

      const { id, email, name, isAdmin } = payload.data;
      const finalToken = jwt.sign(
        { data: { id, email, name, isAdmin, dfa: true } },
        process.env.JWT_SECRET as string,
        { expiresIn: '24h' }
      );

      reply
        .setCookie('session', finalToken, {
          httpOnly: true,
          secure: true,
          sameSite: 'none',
          path: '/',
        })
        .send({ response: 'success' });
    } catch {
      reply.status(401).send({ error: 'Unauthorized' });
    }
  });
}
