import { FastifyInstance } from "fastify";
import  validateUserData from "../utils/userData";
import { getTokenData } from "../utils/getTokenData";

export default async function private_userRoutes(server: FastifyInstance, options: any, done: any) {

  console.log('✅ private_userRoutes loaded');
        
    interface PrivateDataParams {
      email: string;
    }

    interface PrivateDataBody {
      credential: string;
    }

  server.post<{ Params: PrivateDataParams, Body: PrivateDataBody }>('/lookup/:email', async (request, reply) => {
  const value = request.params.email;

  const isEmail = value.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/);
  const isID = value.match(/^[0-9]$/);

  try {
    let result;
    if (isEmail) {
      result = await server.pg.query(`SELECT * FROM users WHERE email = $1`, [value]);
    } else if (isID) {
      result = await server.pg.query(`SELECT * FROM users WHERE id = $1`, [Number(value)]);
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

  server.post<{ Body: DataUserParams }>('/create', { preHandler: [validateUserData] }, async (request, reply) => {
        const email = request.body.email;
        const name = request.body.name;
        const password = request.body.password;
        const type = request.body.type;
        const admin = request.body.admin;
        console.log("data::", email, name, password);
        
        // Simulate creating user data
  try {
    const result = await server.pg.query('SELECT * FROM new_user($1, $2, $3, $4, $5, $6)', [name, type, email, password, null ,true]);
    console.log('[CREATE] New user created:', result.rows[0]);
    const data = await server.pg.query(`SELECT * FROM users WHERE email = $1`, [email]);
    console.log('[DATA] :', data.rows[0]);
    return reply.send({
      ...data.rows[0]
    });
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
      const twoFactorSecret = request.body?.twoFactorSecret;
      const twoFactorSecretTemp = request.body?.twoFactorSecretTemp;
      const id = request.params.id
      console.log("on est rentre", request.params.id);
      if (twoFactorSecret)
        await server.pg.query('SELECT * FROM validate_2fa($1, $2)', [id, twoFactorSecret]);
      if (twoFactorSecretTemp)
        await server.pg.query('SELECT * FROM add_2fa_secret($1, $2)', [id, twoFactorSecretTemp]);
      else if (twoFactorSecretTemp === null)
        await server.pg.query('SELECT * FROM rm_2fa($1)', [id]);
      console.log("on check le secret", twoFactorSecret);
      console.log("on check le secret temp", twoFactorSecretTemp);
      reply.status(200).send({ message: "user_2fa_secret_updated" });
    }
    catch (error) {
    console.error('Insert user error:', error);
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
      const newPassword = request.body?.password;
      const email = request.params.email;
      let changePassword = server.pg.query('SELECT * FROM update_user_password($1, $2)', [email, newPassword]);
      if (!changePassword)
        reply.status(230).send({ error: "Password dosent change" });
      reply.status(200).send({ message: "user_password_updated" });
    } catch (error) {
      console.error('Insert user error:', error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  done();
}