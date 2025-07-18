// src/routes/auth.ts
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import 'dotenv/config';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import validatePassword from '../utils/password';
import isConnected from '../JWT/jsonwebtoken';
import { getTokenData } from '../utils/getTokenData';
import { error } from 'node:console';


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
      if (response.ok && !(error in lookupdata)) {
        if (!lookupdata.provider || lookupdata.provider !== 'google') {
          // User exists but not linked to Google, update provider
          user = lookupdata;
        }
      }
      else {
        // User does not exist, create a new one
        const name = userInfo.given_name.trim().replace(/[^a-zA-Z0-9 ]/g, '_');
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
      }
        const payloadBase = {
          id : user.id,
          email: user.email,
          name: user.name,
          admin: user.admin,
          twofactorSecret: user.twofa_secret,
        };
        const jwtpayload = {
          data: { 
          ...payloadBase,
          dfa: !user.twofa_validated
          }
        };
        const jwttoken = jwt.sign(jwtpayload, process.env.JWT_SECRET as string, { expiresIn: '24h' });
        if (jwttoken) 
          return reply.cookie('jwt_transcendence', jwttoken, {
            path: '/',
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'prod'
          }).redirect(`/login?oauth=true&need2fa=${user.twofa_validated}`);
        else
          throw new Error("no token generated");
    } catch (err) {
      console.error('Error during Google OAuth2 callback:', err);
      return (reply.redirect("/register?oauth-error=0500"));
    }
  });

    function generateRandomName(lenght: number = 5): string {
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!()*+,-./:;<=>?@[]^_`{|}~';
      let result = '';
      for (let i = 0; i<lenght; i++)
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      return result;
    } 

  app.post('/guest', async (req, res) => {
    const name = "guest" + generateRandomName();
    if (!name)
      return (res.status(230).send({ error: "1006" }));
    try {
      const lookup = await fetch(`http://user_service:3000/api/user/lookup/${name}`, 
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          credential: process.env.API_CREDENTIAL
        }),
      });
      if (lookup.ok)
        return (res.status(lookup.status).send({ error: "Fatal error: guestName found"}));
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
      const token = jwt.sign({
        data: {
          id: user.id,
          name: user.name,
          admin: false,
          twoFactorSecret: null,
          dfa: true
        }
      }, process.env.JWT_SECRET as string, { expiresIn: '24h' });
      if (!token)
        throw(new Error("cannot generate user token"));
      return (res.cookie('jwt_transcendence', token, {
        path: "/",
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'prod'
      }).send({ id: user.id, name: user.name, email: user.email }));
    } catch (err) {
      return (res.status(500).send({ error: "Internal server error" }));
    }
  });

      interface signUpBody {
        email: string,
        name: string,
        password: string,
    }
    
    app.post<{ Body: signUpBody }>('/signup', {preHandler:[validatePassword]}, async (req, res) => {
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
            const token = jwt.sign({
            data: {
                id: user.id,
                email: email,
                name: name,
                admin: false,
                twoFactorSecret: user.twofa_secret,
                dfa: true
            }
            }, process.env.JWT_SECRET as string, { expiresIn: '24h' });
            if (!token)
                throw(new Error("cannot generate user token"));
            return (res.cookie('jwt_transcendence', token, {
                path: "/",
                httpOnly: true,
                sameSite: 'lax',
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
      if (response.status !== 200)
        return reply.status(response.status).send({ error: data.error || 'Unknown error' });
      const user = data;
      if (!user || !user.password)
        return reply.status(401).send({ error: 'Invalid email or password' });
      const isValid = await bcrypt.compare(password as string, user.password);
      if (!isValid)
        return reply.status(401).send({ error: 'Invalid email or password' });

      // Notify user_service that the user is logging in
      await fetch(`http://user_service:3000/api/user/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: process.env.API_CREDENTIAL,
          userId: user.id,
          online: true,
        }),
      });
      
      if (user.twofa_validated) {
        
        const pendingToken = jwt.sign(
          { data: { id: user.id, email, name: user.name, admin: user.admin, twoFactorSecret: user.twofa_secret, dfa: false } },
          process.env.JWT_SECRET as string,
          { expiresIn: '24h' }
        );
        if (!pendingToken) {
          throw new Error("cannot generate pending token");
        }
        return reply.cookie('jwt_transcendence', pendingToken, {
          httpOnly: true,
          path: '/',
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
        }).send({ response: "success", need2FA: true });
      } else {
        const token = jwt.sign({ data: {
          id: user.id,
          email: email,
          name: user.name,
          admin: user.admin,
          twoFactorSecret: user.twofa_secret,
          dfa: true
        }}, process.env.JWT_SECRET as string, { expiresIn: '24h' });
      if (!token)
        throw (new Error("cannot generate user token"));
      // If no 2FA, send JWT token directly
      return reply.cookie('jwt_transcendence', token, {
        httpOnly: true,
        path: '/',
        secure: process.env.NODE_ENV === 'prod',
        sameSite: 'lax',
      }).send({ response: "success", need2FA: false });
    }
  } catch (err) {
    console.error('Login fetch failed:', err);
    return reply.status(500).send({ error: 'Internal server error: login fetch failed' });
  }
});

  interface logoutBody {
    token: string
  }

  app.delete<{ Body: logoutBody }>('/logout', {preHandler:[isConnected]},async (request, reply) => {
    try {
      const token = request.cookies['jwt_transcendence'];
      const userId = getTokenData(token).id;

      // Notify user_service that the user is logging out
      await fetch(`http://user_service:3000/api/user/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: process.env.API_CREDENTIAL,
          userId: userId,
          online: false,
        }),
      });

      reply.clearCookie('jwt_transcendence', {}).status(200).send();
    } catch (err) {
      console.error('Logout failed:', err);
      reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Check authentication status and return user info if logged in and 2FA validated
  app.get('/status', async function (request, reply) {
    const token = request.cookies['jwt_transcendence'];
    if (!token || token === 'undefined') {
      return reply.status(401).send({ error: 'Not authenticated' });
    }
    try {
      // Decode token payload (contains user data under .data)
      const { email, name, dfa } = getTokenData(token);
      // If 2FA not yet validated, signal requirement
      if (dfa === false) {
        return reply.status(403).send({ error: 'Two-factor authentication required' });
      }
      // Successful authentication
      return reply.status(200).send({
        message: 'logged_in',
        email,
        name,
        twofaEnabled: true
      });
    } catch (err) {
      console.error('Auth status decode failed:', err);
      return reply.status(401).send({ error: 'Invalid token' });
    }
  });

  done();
}
