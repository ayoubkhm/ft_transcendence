import { FastifyInstance } from "fastify";
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import speakeasy from 'speakeasy';

export default async function dfaRoutes(app: FastifyInstance) {
  // Step 1: setup TOTP secret and provide QR code
  app.get('/setup/ask', {}, async (req, res) => {
    try {
      const token = req.cookies['jwt_transcendence'];
      if (!token) {
        return res.status(401).send({ error: 'Unauthorized' });
      }
      const decode = jwt.verify(token, process.env.JWT_SECRET);
      const tokenpayload = decode.data;
      const secret = speakeasy.generateSecret({
        name: `Transcendence:${tokenpayload.email}`,
        issuer: 'Transcendence'
      });
      
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

  app.post<{Body: dfaSetupAskBody}>('/setup/submit', {}, async (req, res) => {
    try {
      const token = req.cookies['jwt_transcendence'];
      if (!token) {
        return res.status(401).send({ error: 'Unauthorized' });
      }
      const decode = jwt.verify(token, process.env.JWT_SECRET);
      const tokenPayload = decode.data;
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
      const lookupData = await userLookup.json();
      if (!userLookup.ok){
        return res.status(userLookup.status).send({ error: lookupData.error});}
      const user = lookupData;
      if (!user)  
        return res.status(230).send({ error: "1006" });
      let tokenValidates = speakeasy.totp.verify({
	      secret: user.twofa_secret,
        encoding: "base32",
        token: req.body.userToken,
        window: 2,
      });
      if (tokenValidates){
        const update2fa = await fetch(`http://user_service:3000/api/user/2fa/update/${tokenPayload.id}`, {
          method : 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            twoFactorSecret : user.twofa_secret,
            credential: process.env.API_CREDENTIAL
          }),
        });
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
      if (!jsonWebToken) {
        return res.status(401).send({ error: 'Unauthorized' });
      }
      const decode = jwt.verify(jsonWebToken, process.env.JWT_SECRET);
      if (!decode || !decode.data || !decode.data.id)
        return res.status(230).send({ error: "Fatal data" });
      if (decode.data.dfa)
        return res.status(230).send({ error: "Two-factor authentication already completed." });
      const jsonWebTokenPayload = decode.data;
      const userToken = req.body.userToken;
      const verified = speakeasy.totp.verify({
        secret: jsonWebTokenPayload.twoFactorSecret,
        encoding: 'base32',
        token: userToken,
        window: 5});
      if (verified){
        const resignJWT = jwt.sign({
          data: {
            id : jsonWebTokenPayload.id,
            name: jsonWebTokenPayload.name,
            email: jsonWebTokenPayload.email,
            twoFactorSecret : jsonWebTokenPayload.twofa_secret,
            dfa: true
          }
        }, process.env.JWT_SECRET as string, { expiresIn: '24h' });
        if (resignJWT){
           return (res.cookie('jwt_transcendence', resignJWT,  {
                    path: "/",
                    httpOnly: true,
                    sameSite: 'lax',
                    secure: process.env.NODE_ENV === 'prod'
                  })).send({ response: "successfully logged with 2fa" });
        }
      }
      else {
        return (res.status(230).send({ error: "2FA not verified" }));
      }
    } catch (error) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
  });

  app.delete('/delete', async (req, res) => {
    try{
      const jsonWebToken = req.cookies['jwt_transcendence'];
      const decode = jwt.verify(jsonWebToken, process.env.JWT_SECRET);
      const jsonWebTokenPayload = decode.data;
      if (!jsonWebTokenPayload || !jsonWebTokenPayload.id)
        return res.status(230).send({ error: "1019" });
      if (!jsonWebTokenPayload.dfa)
        return res.status(230).send({ error: "1020" });
      const response = await fetch(`http://user_service:3000/api/user/2fa/update/${jsonWebTokenPayload.id}`, {
        method : 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          twoFactorSecretTemp : null,
          credential: process.env.API_CREDENTIAL
        }),
      });
      const data = await response.json();
      if (!response.ok)
        res.status(response.status).send(data);
      res.clearCookie('jwt_transcendence', {path: '/'}).status(200).send({ message: "2fa_successfully_disabled" });
    } catch (error) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
  });
}