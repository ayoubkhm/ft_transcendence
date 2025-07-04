import { FastifyInstance } from "fastify";
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import speakeasy from 'speakeasy';

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
        body: JSON.stringify({ 
          twoFactorSecretTemp: secret.base32,
          credential: process.env.API_CREDENTIAL
         }),
      });
      const data = await response.json();
      if (!response.ok) {
        res.status(response.status).send(data);
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

  
}
