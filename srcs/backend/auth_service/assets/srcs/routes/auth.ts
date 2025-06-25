// src/routes/auth.ts
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import 'dotenv/config';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import validatePassword from '../utils/password';
import { error } from 'node:console';

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
  // callback Google OAuth2
      type LookupUserError = {
        error: number;
      };

    type LookupUserSuccess = {
        id: number;
        email: string;
        name: string;
        error?: never;
      };

    type LookupUserResponse = LookupUserError | LookupUserSuccess;

  app.get('/login/google/callback', async (req: FastifyRequest, reply: FastifyReply) => {
    // 1) Exchange code → AccessToken object
    try {
      const { token } = await app.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(req);
      if (!token) {
        throw (Error("googleOAuth2.getAccessTokenFromAuthorizationCodeFlow failed"));
      }
      const userInfo = await app.googleOAuth2.userinfo(token.access_token);
      if (!userInfo) {
        throw (Error("googleOAuth2.userinfo failed"));
      }
      console.log('🔔 userInfo =', userInfo);
      // 2) Check if user exists in DB
      const response = await fetch(`http://user_service:3000/api/user/lookup/${userInfo.email}`,{
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: process.env.API_CREDENTIAL
        }),
      });
      let user;
      const lookupdata = await response.json();
      //if response pas ok cree le user sinon user trouvé
    } catch (err) {
      console.error('Error during Google OAuth2 callback:', err);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

      interface signUpBody {
        email: string,
        name: string,
        password: string,
    }
    
    app.post<{ Body: signUpBody }>('/signup', { preHandler:[validatePassword], config: {
    } }, async (req, res) => {
        const { email, name, password } = req.body;
        if (!email)
            return (res.status(230).send({ error: "1007" }));
        if (!name)
            return (res.status(230).send({ error: "1008" }));
        if (!password)
            return (res.status(230).send({ error: "1009" }));
        try {
            const hashedPassword = await bcrypt.hash(password, 12);
            const response = await fetch(`http://user_service:3000/api/user/create`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email,
                    name: name,
                    password: hashedPassword,
                    credential: process.env.API_CREDENTIAL
                }),
            });
            const data = await response.json();
            if (response.status != 200)
                return (res.status(response.status).send({ error: data.error}))
            const user = data;
            if (!user)
                throw(new Error("cannot upsert user in prisma"));
            const token = jwt.sign({
            data: {
                id: user.id,
                email: email,
                name: name,
                isAdmin: false,
                twoFactorSecret: user.twoFactorSecret,
                dfa: true
            }
            }, process.env.JWT_SECRET as string, { expiresIn: '24h' });
            if (!token)
                throw(new Error("cannot generate user token"));
            return (res.cookie("jtw_transcendance", token, {
                path: "/",
                httpOnly: true,
                sameSite: "none",
                secure: process.env.NODE_ENV === 'prod'
              }).send({ response: "successfully logged in", need2fa: false }));
        } catch (err) {
      console.error('Signup fetch failed:', err);
      return res.status(500).send({ error: 'Internal server error: signup fetch failed' });
    }
  });

  // Login
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
      const response = await fetch(`http://user_service:3000/api/users/lookup/${email}`, 
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
          { expiresIn: '24h' }
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
      return reply.cookie('jtw_transcendance', token, {
        httpOnly: true,
        path: '/',
        secure: true,
        sameSite: 'none',
      }).send({ response: "success", need2FA: false });
    }
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
      if (!finalToken) throw new Error('Token generation failed');
      return reply.cookie('jtw_transcendance', finalToken, {
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
