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
      console.log("DECODE======>", decode);
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
      const code6 = speakeasy.totp({
        secret:   secret.base32,
        encoding: 'base32',
        // optionnel : window, step, digits
        digits:   6,
        step:     30
      });
      console.log("CODE A 6 CHIFFRES", code6)
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

  app.post<{Body: dfaSetupAskBody}>('/setup/submit', {}, async (req, res) => {
    try {
      const token = req.cookies['jwt_transcendence'];
      console.log('2FA setup token:', token);
      const decode = jwt.verify(token, process.env.JWT_SECRET);
      console.log("DECODE2======>", decode);
      const tokenPayload = decode.data;
      console.log("[2FA2 setup payload] :", tokenPayload);
      //cest pas rentre la PROBLEMEEEEEEEEEEEEEE
      const userLookup = await fetch(`http://user_service:3000/api/user/lookup/${tokenPayload.id}`, {
        method : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          credential: process.env.API_CREDENTIAL
        }),
      });
      console.log("userlookup fetch", userLookup);
      const lookupData = await userLookup.json();
      console.log('[lookupDATA2] =', lookupData);
      // il faut qu on est le twosecrettemp pour le verfier avec totp verify
      if (!userLookup.ok){
        console.log("on al");
        return res.status(userLookup.status).send({ error: lookupData.error});}
      const user = lookupData;
      if (!user)  
        return res.status(230).send({ error: "1006" });
      console.log("[U2]===>", user);
      console.log("tokeuser", req.body.userToken);
      let tokenValidates = speakeasy.totp.verify({
	      secret: user.twofactorsecrettemp,
        encoding: "base32",
        token: req.body.userToken,
        window: 2,
      })
      console.log("[TOKENVALID]===> ", tokenValidates);
      if (tokenValidates){
        const update2fa = await fetch(`http://user_service:3000/api/user/2fa/update/${tokenPayload.id}`, {
          method : 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            twoFactorSecret : user.twofactorsecrettemp,
            credential: process.env.API_CREDENTIAL
          }),
        });
        //verification de fetch
        console.log("OLILI");
        const fetchReply = await update2fa.json();
        if (!update2fa.ok)
          return res.status(update2fa.status).send(fetchReply);
        res.clearCookie('jwt_transcendence', {path: '/'}).status(200).send({ message: "2fa_successfully_enabled" })
      }
      else
        return res.status(230).send({ error: "10017"});
    }
    catch {
      return res.status(401).send({ error: 'Unauthorized' });
    }
  });

  interface dfaSubmitBody {
    userToken: string,
  }

  app.post<{Body: dfaSubmitBody}>('/submit', {}, async (req, res) => {
    try {
      const jsonWebToken = req.cookies['jwt_transcendence'];
      const decode = jwt.verify(jsonWebToken, process.env.JWT_SECRET);
      console.log("DECODE333=>>>", decode);
      if (!decode || !decode.data || !decode.id)
        return res.status(230).send({ error: "Fatal data" });
      if (decode.data.dfa)
        return res.status(230).send({ error: "Two-factor authentication already completed." });
      const jsonWebTokenPayload = decode.data;
      const userToken = req.body;
    } catch {
      return res.status(401).send({ error: 'Unauthorized' });
    }
  });
}
