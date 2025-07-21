import { FastifyInstance } from "fastify";
import validateUserData from "../utils/userData";
import { getTokenData } from "../utils/getTokenData";
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream';
import { promisify } from 'util';
import jwt from 'jsonwebtoken';

export default async function private_userRoutes(server: FastifyInstance, options: any, done: any) {

  console.log('✅ private_userRoutes loaded');
  const pump = promisify(pipeline);
  
  // Route for avatar upload
  server.post('/upload_avatar', async (request, reply) => {
    console.log('[UPLOAD] Route atteinte');
    // 1️⃣ Auth via JWT in cookie
    const token = (request.cookies as any)?.jwt_transcendence;
    if (!token) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    let payload;
    try {
      payload = getTokenData(token);
    } catch {
      return reply.status(401).send({ error: 'Invalid token' });
    }
    const userId = payload.id;
    // 2️⃣ Prepare upload directory (now at container path /usr/src/avatar)
    const uploadDir = '/usr/src/avatar';
    fs.mkdirSync(uploadDir, { recursive: true });
    // 3️⃣ Read multipart parts
    const parts = request.parts();
    for await (const part of parts) {
      if (part.type === 'file' && part.fieldname === 'avatar') {
        const ext = path.extname(part.filename || '');
        const filename = `avatar_${userId}_${Date.now()}${ext}`;
        const filePath = path.join(uploadDir, filename);
        try {
          await pump(part.file, fs.createWriteStream(filePath));
        } catch (err) {
          request.log.error(err, 'Upload error');
          return reply.status(500).send({ error: 'Upload failed' });
        }
        // URL under user API so it is proxied by Nginx
        const publicUrl = `/api/user/avatars/${filename}`;
        // 4️⃣ Update DB
        try {
          await server.pg.query(
            'UPDATE users SET avatar = $1 WHERE id = $2',
            [publicUrl, userId]
          );
        } catch (err) {
          request.log.error(err, 'DB update error');
        }
        // 5️⃣ Response
        return reply.status(200).send({ avatar: publicUrl });
      }
    }
    return reply.status(400).send({ error: 'No file uploaded under field "avatar"' });
  });
        
    interface PrivateDataParams {
      email: string;
    }

    interface PrivateDataBody {
      credential?: string;
    }

  server.post<{ Params: PrivateDataParams, Body: PrivateDataBody }>('/lookup/:email', async (request, reply) => {
  // Authentication: allow if valid API credential or JWT for self/admin
  const apiCred = request.body?.credential;
  const token = (request.cookies as any)?.jwt_transcendence;
  if (!apiCred && !token) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
  if (apiCred) {
    if (apiCred !== process.env.API_CREDENTIAL) {
      return reply.status(403).send({ error: 'Forbidden' });
    }
  }
  if (token) {
    let tokData;
    try {
      tokData = getTokenData(token);
    } catch {
      return reply.status(403).send({ error: 'Forbidden' });
    }
    const identifier = request.params.email;
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
    const isID = /^\d+$/.test(identifier);
    if (isEmail) {
      if (tokData.email !== identifier && !tokData.admin) {
        return reply.status(403).send({ error: 'Forbidden' });
      }
    } else if (isID) {
      if (tokData.id !== Number(identifier) && !tokData.admin) {
        return reply.status(403).send({ error: 'Forbidden' });
      }
    } else {
      if (tokData.name !== identifier && !tokData.admin) {
        return reply.status(403).send({ error: 'Forbidden' });
      }
    }
  }
  const value = request.params.email;

  // Robust identifier checking
  const isID = /^\d+$/.test(value);
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  try {
    let result;
    if (isID) {
      result = await server.pg.query(`SELECT * FROM users WHERE id = $1`, [Number(value)]);
    } else if (isEmail) {
      result = await server.pg.query(`SELECT * FROM users WHERE email = $1`, [value]);
    } else {
      result = await server.pg.query(`SELECT * FROM users WHERE name = $1`, [value]);
    }

    if (!result || result.rows.length === 0) {
      return reply.status(404).send({ error: 'User not found' });
    }
    return reply.send(result.rows[0]);

  } catch (error) {
    console.error('Raw query error:', error);
    return reply.status(500).send({ error: 'Internal server error' });
  }
});

    interface DataUserParams {
      email: string,
      name: string,
      password?: string;
      credential: string,
      admin?: boolean,
      type?: string
    }

  server.post<{ Body: DataUserParams }>('/create', async (request, reply) => {
        const email = request.body.email;
        const name = request.body.name;
        const password = request.body.password;
        
        // Security: Do not allow setting admin from request
        const type = request.body.type ?? 'user'; // Default to 'user'
        const admin = false; // Default to false
        
  try {
    // Attempt to create the user; new_user returns (success, msg, new_user_id)
    const twofa_validated = type === 'guest' ? false : true;
    const result = await server.pg.query(
      'SELECT * FROM new_user($1, $2, $3, $4, $5, $6)',
      [name, type, email, password, null, twofa_validated]
    );
    const row = result.rows[0];
    console.log('[CREATE] new_user result:', row);
    // If creation failed (e.g., duplicate email), return conflict
    if (!row || row.success === false) {
      const errMsg = row && row.msg ? row.msg : 'User creation failed';
      return reply.status(409).send({ error: errMsg });
    }
    // On success, fetch the full user record
    const data = await server.pg.query(
      'SELECT * FROM users WHERE id = $1',
      [row.new_user_id]
    );
    const user = data.rows[0];
    console.log('[DATA] new user record:', user);
    return reply.send(user);
  } catch (error) {
    console.error('Insert user error:', error);
    return reply.status(500).send({ error: 'Internal server error' });
  }
    });
  
    interface DfaUpdateParams
    {
        id: string,
    }

    interface DfaUpdateBody
    {
        credential: string,
        twoFactorSecret?: string,
        twoFactorSecretTemp?: string,
    }

  server.put<{ Body: DfaUpdateBody, Params: DfaUpdateParams }>('/2fa/update/:id', async (request, reply) => {
    try {
      const apiCred = request.body?.credential;
      const id = parseInt(request.params.id, 10);
      if (apiCred) {
        if (apiCred !== process.env.API_CREDENTIAL)
          return reply.status(403).send({ error: 'Forbidden' });}
      if (!id || isNaN(id))
        return reply.status(400).send({ error: 'Invalid user ID' });
    
      const twoFactorSecret = request.body?.twoFactorSecret;
      const twoFactorSecretTemp = request.body?.twoFactorSecretTemp;
      
      if (twoFactorSecret)
        await server.pg.query('SELECT * FROM validate_2fa($1, $2)', [id, twoFactorSecret]);
      if (twoFactorSecretTemp)
        await server.pg.query('SELECT * FROM add_2fa_secret($1, $2)', [id, twoFactorSecretTemp]);
      else if (twoFactorSecretTemp === null)
        await server.pg.query('SELECT * FROM rm_2fa($1)', [id]);
      
      reply.status(200).send({ message: "user_2fa_secret_updated" });
    }
    catch (error) {
    console.error('Update 2FA error:', error);
    return reply.status(500).send({ error: 'Internal server error' });
  }
  });
  
    interface editUpdateBody
    {
        password: string,
        credential: string,
        flag?: string, // Optional flag for special cases
        email?: string, // Optional email for update
        name?: string, // Optional name for update
    }

    interface editUpdateParams
    {
        email: string,
    }

  server.put<{Body: editUpdateBody, Params: editUpdateParams}>('/edit/:email', async (request, reply) => {
    try {
      const token = (request.cookies as any)?.jwt_transcendence;
      const apiCred = request.body?.credential;
      const flag = request.body?.flag;

      // Path 1: Service-to-service call for password update
      if (apiCred) {
        if (apiCred !== process.env.API_CREDENTIAL) {
          return reply.status(403).send({ error: 'Forbidden' });
        }
        if (flag !== 'password') {
          return reply.status(403).send({ error: 'API credential can only be used for password updates' });
        }
        
        const newPassword = request.body?.password;
        const email = request.params.email;
        if (!newPassword) {
          return reply.status(400).send({ error: 'Password cannot be empty' });
        }
        
        const result = await server.pg.query('SELECT * FROM update_user_password($1, $2)', [email, newPassword]);
        const row = result.rows[0];

        if (!row || !row.success) {
          return reply.status(404).send({ error: row.msg || "Password update failed" });
        }
        return reply.status(200).send({ message: "user_password_updated" });
      }

      // Path 2: User-initiated call (email, name, or password change)
      if (token) {
        let tokenPayload;
        try {
          tokenPayload = getTokenData(token);
        } catch {
          return reply.status(401).send({ error: 'Invalid token' });
        }

        if (!tokenPayload.admin && tokenPayload.email !== request.params.email) {
          return reply.status(403).send({ error: 'Forbidden' });
        }

        if (flag === "email") {
          const newEmail = request.body?.email;
          const email = tokenPayload.email;
          if (!newEmail || !email) {
            return reply.status(400).send({ error: 'Email and name cannot be empty' });
          }
          const result = await server.pg.query('SELECT * FROM update_user_email($1, $2)', [email, newEmail]);
          const row = result.rows[0];
          if (!row || !row.success) {
            return reply.status(404).send({ error: row.msg || "Email update failed" });
          }

          // Re-fetch user to get all data for token
          const userRes = await server.pg.query('SELECT * FROM users WHERE email = $1', [newEmail]);
          const user = userRes.rows[0];

          const newToken = jwt.sign({
            data: {
              id: user.id,
              email: user.email,
              name: user.name,
              admin: user.admin,
              twoFactorSecret: user.twofa_secret,
              dfa: tokenPayload.dfa // Preserve 2FA status
            }
          }, process.env.JWT_SECRET as string, { expiresIn: '24h' });
          
          reply.setCookie('jwt_transcendence', newToken, {
            path: '/',
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'prod'
          });

          return reply.status(200).send({ message: "user_email_updated", token: newToken });
        }
        else if (flag === "name") {
          const newName = request.body?.name;
          const email = tokenPayload.email;
          const user = await server.pg.query('SELECT * FROM users WHERE name = $1', [newName]);
          if (user.rows.length > 0) {
            return reply.status(409).send({ error: 'Name already exists' });
          }
          if (newName === tokenPayload.name) {
            return reply.status(400).send({ error: 'Name cannot be the same as current name' });
          }
          if (!newName || !email) {
            return reply.status(400).send({ error: 'Email and name cannot be empty' });
          }
          const result = await server.pg.query('SELECT * FROM update_user_name($1, $2)', [email, newName]);
          const row = result.rows[0];
          if (!row || !row.success) {
            return reply.status(404).send({ error: row.msg || "Name update failed" });
          }
          return reply.status(200).send({ message: "user_name_updated" });
        } else {
           return reply.status(400).send({ error: 'Invalid flag for user-initiated edit' });
        }
      }
      
      return reply.status(401).send({ error: 'Unauthorized' });

    } catch (error) {
      console.error('Update error:', error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  done();
}
