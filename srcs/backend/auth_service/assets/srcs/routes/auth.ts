// src/routes/auth.ts
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import 'dotenv/config';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

// Base URL for User service (DB service)
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';
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
  app.get('/login/google/callback', async (req: FastifyRequest, reply: FastifyReply) => {
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

    interface SingupBody {
    email: string;
    password: string;
    name: string;
  }
  app.post<{ Body: SingupBody }>('/signup', async (request, reply) => {
    const { email, password, name } = request.body;
    if (
      !email ||
      !password ||
      !name ||
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      typeof name !== 'string' ||
      !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
    ) {
      return reply.status(400).send({ error: 'Invalid email, password or name' });
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const response = await fetch(`${USER_SERVICE_URL}/api/users/create`, 
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password: hashedPassword,
        name,
        credential: process.env.API_CREDENTIAL
      }),
    });
    const data = await response.json();
    if (response.status !== 200)
      return reply.status(response.status).send({ error: data.error || 'Unknown error' });
    const user = data;
    if (!user || !user.id)
      return reply.status(400).send({ error: 'User creation failed' });
    const token = jwt.sign({data: {
      id: user.id,
      email: email,
      name: user.name,
      towfactorSecret: user.towfactorsecret,
      dfa: true
    }}, process.env.JWT_SECRET as string, { expiresIn: '24h' });
    if (!token)
      return reply.status(500).send({ error: 'Token generation failed' });
    return reply.cookie('session', token, {
      httpOnly: true,
      path: '/',
      secure: true,
      sameSite: 'none',
    }).send({ response: "success", need2FA: false });
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
    const response = await fetch(`${USER_SERVICE_URL}/api/users/lookup/${encodeURIComponent(email)}`, 
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
    if (user.isTowFAEnabled) {
      // Send a magic link as second factor
      const pendingToken = jwt.sign(
        { data: { id: user.id, email, name: user.name, isAdmin: user.isAdmin }, pendingMagic: true },
        process.env.JWT_SECRET as string,
        { expiresIn: '15m' }
      );
      const host = request.headers.host!;
      const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
      const link = `${protocol}://${host}/login/magic/callback?token=${pendingToken}`;
      await transporter.sendMail({
        to: email,
        subject: 'Your login magic link',
        html: `<p>Hello ${user.name},</p><p>Click <a href="${link}">here</a> to complete login.</p>`
      });
      return reply.send({ response: 'magic_sent' });
    } else {
    const token = jwt.sign({data: {
      id: user.id,
      email: email,
      name: user.name,
      isAdmin: user.isAdmin,
      towfactorSecret: user.towfactorsecret,
      dfa: true
    }}, process.env.JWT_SECRET as string, { expiresIn: '24h' });
    if (!token)
      throw (new Error("cannot generate user token"));
    return reply.cookie('session', token, {
      httpOnly: true,
      path: '/',
      secure: true,
      sameSite: 'none',
    }).send({ response: "success", need2FA: false });
  }

    
    console.log("Réponse :", data)
    // ici tu peux comparer contre ta base, bcrypt, etc.
    return { ok: true };
  });

  // Magic link callback
  app.get('/login/magic/callback', async (request: FastifyRequest, reply: FastifyReply) => {
    const { token } = request.query as { token?: string };
    if (!token) {
      return reply.status(400).send({ error: 'Missing token' });
    }
    try {
      const payload: any = jwt.verify(token, process.env.JWT_SECRET as string);
      if (!payload.pendingMagic) {
        return reply.status(403).send({ error: 'Invalid or expired magic link' });
      }
      const { id, email, name, isAdmin } = payload.data;
      const finalToken = jwt.sign(
        { data: { id, email, name, isAdmin, dfa: true } },
        process.env.JWT_SECRET as string,
        { expiresIn: '24h' }
      );
      if (!finalToken) throw new Error('Token generation failed');
      return reply.cookie('session', finalToken, {
        httpOnly: true,
        path: '/',
        secure: true,
        sameSite: 'none',
      }).send({ response: 'success' });
    } catch (err) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });
}
