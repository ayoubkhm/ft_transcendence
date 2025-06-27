import { FastifyInstance } from "fastify";
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import speakeasy from 'speakeasy';

// In-memory 2FA stores (for demo; replace with persistent storage)
const temp2faSecrets = new Map<string,string>();
const user2faSecrets = new Map<string,string>();
const twoFaEnabled = new Set<string>();

export default async function dfaRoutes(app: FastifyInstance) {
  // Step 1: setup TOTP secret and provide QR code
  app.get('/setup/ask', async (req, res) => {
    try {
      const token = req.cookies['jwt_transcendence'];
      console.log('2FA setup token:', token);
      const decode = jwt.verify(token, process.env.JWT_SECRET);
      const tokenpayload = decode.data;
      console.log('2FA setup payload:', tokenpayload);
      const secret = speakeasy.generateSecret({
        name: `Transcendence:${tokenpayload.email}`,
        issuer: 'Transcendence'
      });
      console.log('2FA setup secret:', secret);
      // Store the secret temporarily
      const response = await fetch(`http://user_service:3000/api/user/2fa/update/${tokenpayload.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ temp2faSecrets: secret.base32,
          credential: process.env.API_CREDENTIAL
         }),
      });
      const data = await response.json();
      if (!response.ok) {
        res.status(response.status).send({ error: 'Failed to update user 2FA secret' });
      }
      const qrcode = await QRCode.toDataURL(secret.otpauth_url);
      return res.status(230).send({
        message: '2FA setup initiated and QR code generated',
        qrCode: qrcode
      });
    } catch (err) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
  });
  // Step 2: user confirms TOTP code to enable 2FA
  app.post(
    '/2fa/enable',
    { preHandler: (app as any).authenticate },
    async (req: any, res) => {
      const userId = req.user.sub;
      const { token } = req.body as { token: string };
      const secret = temp2faSecrets.get(userId);
      if (!secret) return res.status(400).send({ error: 'No setup in progress' });
      const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: 1
      });
      if (!verified) return res.status(403).send({ error: 'Invalid 2FA code' });
      // Move to persistent store
      user2faSecrets.set(userId, secret);
      twoFaEnabled.add(userId);
      temp2faSecrets.delete(userId);
      return res.send({ ok: true });
    }
  );
  // Step 3: verify pending 2FA during login
  app.post('/2fa/verify', async (req: any, res) => {
    try {
      const pendingToken = (req.cookies as Record<string,string>).session;
      if (!pendingToken) throw new Error();
      const payload: any = jwt.verify(pendingToken, process.env.JWT_SECRET!);
      if (!payload.pending2fa) throw new Error();
      const userId = payload.sub;
      const { token } = req.body as { token: string };
      const secret = user2faSecrets.get(userId);
      if (!secret) return res.status(403).send({ error: '2FA not enabled' });
      const verified = speakeasy.totp.verify({ secret, encoding: 'base32', token, window: 1 });
      if (!verified) return res.status(403).send({ error: 'Invalid 2FA code' });
      // Issue final session token
      const finalToken = jwt.sign(
        { sub: userId },
        process.env.JWT_SECRET!,
        { expiresIn: '24h' }
      );
      return res
        .clearCookie('session')
        .setCookie('session', finalToken, {
          httpOnly: true,
          path: '/',
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict'
        })
        .send({ ok: true });
    } catch (err) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
  });
}
