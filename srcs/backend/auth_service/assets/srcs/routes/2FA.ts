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
  app.get(
    '/2fa/setup',
    { preHandler: (app as any).authenticate },
    async (req: any, res) => {
      try {
        const userId = req.user.sub;
        const secret = speakeasy.generateSecret({ name: `YourApp:${userId}` });
        const qrCode = await QRCode.toDataURL(secret.otpauth_url!);
        // Store temp secret until user confirms
        temp2faSecrets.set(userId, secret.base32);
        return res.send({ qrCode });
      } catch (error) {
        console.error(error);
        return res.status(500).send({ error: 'Server error' });
      }
    }
  );
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
