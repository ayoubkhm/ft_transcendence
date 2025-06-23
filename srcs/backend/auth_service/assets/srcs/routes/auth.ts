// src/routes/auth.ts
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import 'dotenv/config';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

// Configure SMTP transporter for sending magic links
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false, // upgrade later with STARTTLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

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
    const response = await fetch(`http://localhost:3000/api/users/lookup/${email}`, 
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        credential: process.env.API_CREDENTIAL
      }),
    });
    const data = await response.json()
    if (response.status !== 200)
      return reply.status(response.status).send({ error: data.error || 'Unknown error' });
    const user = data
    if (!user || !user.password)
      return reply.status(401).send({ error: 'Invalid email or password' });
    const isValid = await bcrypt.compare(password as string, user.password);
    if (!isValid)
      return reply.status(401).send({ error: 'Invalid email or password' });
    if (user.isBanned) {
      return reply.status(403).send({ error: 'User is banned' });
    }
    // Generate a short-lived magic link token
    const magicToken = jwt.sign(
      { sub: user.id, email },
      process.env.JWT_SECRET as string,
      { expiresIn: '15m' }
    );
    // Build magic link URL
    const link = `${process.env.APP_URL}/api/auth/magic-login?token=${magicToken}`;
    // Send the magic link via email
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Your login link',
      text: `Click this link to login: ${link}`
    });
    return reply.send({ ok: true, message: 'Magic link sent to your email.' });
  });
  // Magic link verification for email-based 2FA
  app.get('/magic-login', async (req: FastifyRequest, reply: FastifyReply) => {
    const { token } = req.query as { token?: string };
    if (!token) {
      return reply.status(400).send({ error: 'No token provided' });
    }
    try {
      const payload: any = jwt.verify(token, process.env.JWT_SECRET!);
      // Issue full session token
      const sessionToken = jwt.sign(
        { sub: payload.sub, email: payload.email },
        process.env.JWT_SECRET!,
        { expiresIn: '24h' }
      );
      return reply
        .setCookie('session', sessionToken, {
          httpOnly: true,
          path: '/',
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict'
        })
        .send({ ok: true });
    } catch (err) {
      return reply.status(401).send({ error: 'Invalid or expired link' });
    }
  });
}
