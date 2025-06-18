import { FastifyInstance } from "fastify";
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import speakeasy from 'speakeasy';

export default async function dfaRoutes (app: FastifyInstance) {
    app.get('/2fa/setup/ask', {}, async (req, res) => {
    try {
      const secret = speakeasy.generateSecret({ name: 'testapp:mehdi' });
      const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

      res.setCookie('temp_2fa_secret', secret.base32, {
        path: '/',
        httpOnly: true,
        sameSite: 'strict',
        secure: true,
      });

      return res.send({
        message: 'QR code generated',
        qrCode,
        secret: secret.base32,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).send({ error: '0500' });
    }
    });
    app.post('/2fa/verify', async (req: any, res) => {
        const {token} = req.body;
        const secret = req.cookies.temp_2fa_secret;
        
        if (!secret) return res.status(401).send({ error: 'No 2FA secret' });
        
        const verified = speakeasy.totp.verify({
            secret,
            encoding: "base32",
            token,
            window: 2
        });
        if (!verified) return res.status(403).send({ error: 'Invalid 2FA token' });
        const jwtToken = jwt.sign({ dfa: true }, process.env.JWT_SECRET!, { expiresIn: '1h' });
        res.clearCookie('temp_2fa_secret');
        return res.send({ message: '2FA success', token: jwtToken });
    });
}
