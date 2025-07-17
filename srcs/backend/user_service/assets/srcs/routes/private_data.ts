import { FastifyInstance } from "fastify";
import validateUserData from "../utils/userData";
import { getTokenData } from "../utils/getTokenData";
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream';
import { promisify } from 'util';

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

    interface profilePictureBody{
        credential: string,
        profPicture: string,
        id: number
    }

    server.put<{Body: profilePictureBody}>('/profile_picture', async (request, reply) => {
      // Security: JWT validation and authorization
      const token = (request.cookies as any)?.jwt_transcendence;
      if (!token) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }
      let tokenPayload;
      try {
        tokenPayload = getTokenData(token);
      } catch {
        return reply.status(401).send({ error: 'Invalid token' });
      }
      
      const id = request.body?.id;
      const pp = request.body?.profPicture;

      // Security check: allow if admin or self
      if (!tokenPayload.admin && tokenPayload.id !== id) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      if (!pp || !id)
        return reply.status(400).send({ error: "Missing parameters" });
      try {
        // This part of the code is not implemented yet.
        // When it is, it should use the validated 'id' to update the profile picture.
        const result = null; 
        if (!result)
          return reply.status(501).send({ error: "Not implemented" });
        reply.status(200).send();
      } catch (error) {
          console.log('error', error)
          return reply.status(500).send({ error: "Internal server error" });
      }
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
    console.log('[LOOKUP] Utilisateur trouvé :', result.rows[0]);
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
        
        // Security: Do not allow setting admin or type from request
        const type = 'user'; // Default to 'user'
        const admin = false; // Default to false

        console.log("data::", email, name, password);
        
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
      // Security: JWT validation and authorization
      const token = (request.cookies as any)?.jwt_transcendence;
      if (!token) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }
      let tokenPayload;
      try {
        tokenPayload = getTokenData(token);
      } catch {
        return reply.status(401).send({ error: 'Invalid token' });
      }

      const id = parseInt(request.params.id, 10);

      // Security check: allow if admin or self
      if (!tokenPayload.admin && tokenPayload.id !== id) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

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
  
    interface passwordUpdateBody
    {
        password: string,
        credential: string,
    }

    interface passwordUpdateParams
    {
        email: string,
    }

  server.put<{Body: passwordUpdateBody, Params: passwordUpdateParams}>('/password/:email', async (request, reply) => {
    try {
      // Security: JWT validation and authorization
      const token = (request.cookies as any)?.jwt_transcendence;
      if (!token) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }
      let tokenPayload;
      try {
        tokenPayload = getTokenData(token);
      } catch {
        return reply.status(401).send({ error: 'Invalid token' });
      }

      // Security check: allow if admin or self
      if (!tokenPayload.admin && tokenPayload.email !== request.params.email) {
        return reply.status(403).send({ error: 'Forbidden' });
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
      
      reply.status(200).send({ message: "user_password_updated" });
    } catch (error) {
      console.error('Update password error:', error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  done();
}