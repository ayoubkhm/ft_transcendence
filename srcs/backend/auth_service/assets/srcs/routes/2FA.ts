import { FastifyInstance } from "fastify";
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import speakeasy from 'speakeasy';

export default async function dfaRoutes(app: FastifyInstance) {
  // Step 1: setup TOTP secret and provide QR code
  app.get('/setup/ask', {}, async (req, res) => {
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

  interface dfaSetupAskBody {
    userToken: string
  }
//A TESTERRR
  app.post<{Body: dfaSetupAskBody}>('/setup/submit', {}, async (req, res) => {
    try {
      const token = req.cookies['jwt_transcendence'];
      console.log('2FA setup token:', token);
      const decode = jwt.verify(token, process.env.JWT_SECRET);
      const tokenPayload = decode.data;
      console.log("[2FA setup payload] :", tokenPayload);
      //cest pas rentre la PROBLEMEEEEEEEEEEEEEE
      const userLookup = await fetch(`http://user_service:3000/api/user/lookup/${tokenPayload.email}`, {
        method : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          credential: process.env.API_CREDENTIAL
        }),
      });
      const lookupData = userLookup.json();
      console.log('[lookupDATA] =', lookupData);
      // il faut qu on est le twosecrettemp pour le verfier avec totp verify
      if (!lookupData.ok)
        return res.status(userLookup.status).send({ error: lookupData.error});
      const user = lookupData;
      if (!user)  
        return res.status(230).send({ error: "1006" });
      let tokenValidates = speakeasy.totp.verify({
	      secret: user.twoFactorSecretTemp,
        encoding: "base32",
        token: req.body.userToken,
        window: 2,
      })
      if (tokenValidates){
        const update2fa = await fetch(`http://user_service:3000/api/user//2fa/update/${tokenPayload.id}`, {
          method : 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            twoFactorSecret : user.twoFactorSecretTemp,
            credential: process.env.API_CREDENTIAL
          }),
        });
        //verification de fetch
        const fetchReply = update2fa.json();
        if (!fetchReply.ok)
          return res.status(fetchReply.status).send({error: fetchReply.error});
        res.clearCookie('jwt_transcendence', {path: '/'}).status(200).send({ message: "2fa_successfully_enabled" })
      }
      else
        return res.status(230).send({ error: "10017"});
    }
    catch {
      return res.status(401).send({ error: 'Unauthorized' });
    }
  });
}
