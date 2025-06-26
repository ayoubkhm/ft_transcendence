// src/routes/auth.ts
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import 'dotenv/config';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import validatePassword from '../utils/password';
import isConnected from '../JTW/jsonwebtoken';
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
export default function authRoutes(app: FastifyInstance, options: any, done: any) {
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
      const response = await fetch(`http://user_service:3000/api/user/lookup/${userInfo.email}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: process.env.API_CREDENTIAL
        }),
      });
      let user;
      const lookupdata = await response.json();
      console.log("LOOKUPDATA: ", lookupdata);
      if (response.ok && !(error in lookupdata)) {
        if (!lookupdata.provider || lookupdata.provider !== 'google') {
          // User exists but not linked to Google, update provider
          user = lookupdata;
        }
      }
      else {
        // User does not exist, create a new one
        const name = userInfo.given_name.trim().replace(/[^a-zA-Z0-9 ]/g, '_');
        console.log('name', name);
        const response = await fetch(`http://user_service:3000/api/user/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: userInfo.email,
            name: name,
            provider: 'google',
            type: 'oauth',
            credential: process.env.API_CREDENTIAL,
          }),
        });
        if (!response.ok) {
          const data = await response.json();
          console.error('Error creating user:', data);
          return reply.status(response.status).send({ error: data.error || 'Internal server error' });
        }

        user = await response.json();
        
        const payloadBase = {
          id : user.id,
          email: user.email,
          name: user.name,
          isAdmin: user.isAdmin,
          towfactorSecret: user.towfactorSecret,
        };
        const jwtpayload = {
          data: payloadBase,
          dfa: !user.twoFactorSecret,
        };
        const token = jwt.sign(jwtpayload, process.env.JWT_SECRET as string, { expiresIn: '24h' });
        if (token) {
          return reply.cookie('jtw_transcendance', token, {
            path: '/',
            httpOnly: true,
            sameSite: 'none',
            secure: process.env.NODE_ENV === 'prod'
          }).redirect("/login?oauth=true&need2fa=${user.isTwoFactorEnabled}");
        }
        else {
          throw new Error("no token generated");
        }
      }
    } catch (err) {
      console.error('Error during Google OAuth2 callback:', err);
      return (reply.redirect("/register?oauth-error=0500"));
    }
  });

        interface guestBody {
        name: string,
    }

  app.post<{Body: guestBody}>('/guest', async (req, res) => {
    const name = req.body.name;
    if (!name)
      return (res.status(230).send({ error: "1006" }));
    try {
      const response = await fetch(`http://user_service:3000/api/user/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name,
          type: 'guest',
          credential: process.env.API_CREDENTIAL,
        }),
      });
      const data = await response.json();
      if (response.status != 200)
        return (res.status(response.status).send({ error: data.error }));
      const user = data;
      if (!user)
        throw (new Error("cannot upsert user in prisma"));
      console.log("User guest created:", user);
    } catch (err) {
      return (res.status(500).send({ error: "Internal server error" }));
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
                    type: 'signed',
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
            console.log("🔐 JWT_SECRET =", process.env.JWT_SECRET);
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
      return res.status(500).send({ err });
    }
  });

  // Login
  interface LoginBody {
    email: string;
    password: string;
  }
    app.post<{ Body: LoginBody }>('/login', async (request, reply) => {
      
      try {
      const email = request.body.email;
      const password = request.body.password;
      console.log('Login attempt for email:', email);
      console.log('Password:', password);
      if (
        !email ||
        !password ||
        typeof email !== 'string' ||
        typeof password !== 'string' ||
        !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
      ) {
        return reply.status(400).send({ error: 'Invalid email or password' });
      }
      const response = await fetch(`http://user_service:3000/api/user/lookup/${email}`, 
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
      const data = await response.json();
      console.log("data:::::::::::::::::::", data);
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
      if (user.isTwoFAEnabled) {
        // Send a magic link as second factor
        const pendingToken = jwt.sign(
          { data: { id: user.id, email, name: user.name, isAdmin: user.isAdmin, twoFactorSecret: user.twoFactorSecret, dfa: false } },
          process.env.JWT_SECRET as string,
          { expiresIn: '24h' }
        );
        if (!pendingToken) {
          throw new Error("cannot generate pending token");
        }
        return reply.cookie('jtw_transcendance', pendingToken, {
          httpOnly: true,
          path: '/',
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'none',
        }).send({ response: "success", need2FA: true });
      } else {
        const token = jwt.sign({ data: {
          id: user.id,
          email: email,
          name: user.name,
          isAdmin: user.isAdmin,
          twoFactorSecret: user.twoFactorSecret,
          dfa: true
        }}, process.env.JWT_SECRET as string, { expiresIn: '24h' });
      console.log("token:", token);
      if (!token)
        throw (new Error("cannot generate user token"));
      return reply.cookie('jtw_transcendance', token, {
        httpOnly: true,
        path: '/',
        secure: true,
        sameSite: 'none',
      }).send({ response: "success", need2FA: false });
      console.log("cookies", cookie);
    }
  } catch (err) {
    console.error('Login fetch failed:', err);
    return reply.status(500).send({ error: 'Internal server error: login fetch failed' });
  }
});

  app.get('/status', async function (request, reply) {
    await isConnected(request, reply, () => {
      return (reply.status(200).send({ message: "logged_in" }));
    });
  });

  done();
}
