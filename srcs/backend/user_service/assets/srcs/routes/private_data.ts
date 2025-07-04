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
      provider?: string,
      credential: string,
      isAdmin?: boolean,
      type?: string
    }

  server.post<{ Body: DataUserParams }>('/create', { preHandler: [validateUserData] }, async (request, reply) => {
        const email = request.body.email;
        const name = request.body.name;
        const password = request.body.password;
        const type = request.body.type;
        const isAdmin = request.body.isAdmin;
        const provider = request.body.provider;
        console.log("data::", email, name, password);
        
        // Simulate creating user data
  try {
    const result = await server.pg.query('SELECT * FROM new_user($1, $2, $3, $4)', [name, type, email, password]);
    console.log('[CREATE] New user created:', result.rows[0]);
    const data = await server.pg.query(`SELECT * FROM users WHERE email = $1`, [email]);
    console.log('[DATA] :', data.rows[0]);
    return reply.send({
      user: data.rows[0]
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

    interface DfaPut
    {
        twofa?: boolean,
        twoFactorSecret?: string,
        twoFactorSecretTemp?: string,
    }

  server.put<{ Body: DfaUpdateBody, Params: DfaUpdateParams }>('/2fa/update/:id', async (request, reply) => {
    try {
      const twoFactorSecret = request.body?.twoFactorSecret;
      const twoFactorSecretTemp = request.body?.twoFactorSecretTemp;
      console.log("on est rentre");
      let put: DfaPut = {};
      if (twoFactorSecret)
      {
        put.twofa = true;
        put.twoFactorSecret = twoFactorSecret;
      }
      if (twoFactorSecretTemp)
        put.twoFactorSecretTemp = twoFactorSecretTemp;
      console.log("on check le secret", twoFactorSecret);
      console.log("on check le secret temp", twoFactorSecretTemp);
      let user = server.pg.query('');
      if (!user)
        reply.status(230).send({ error: "1006" });
      reply.status(200).send({ message: "user_2fa_secret_updated" });
    }
    catch (error) {
    console.error('Insert user error:', error);
    return reply.status(500).send({ error: 'Internal server error' });
  }
  });

  interface deleteUserParams
  {
    email: string
  }

  //A TESTER
  server.delete<{Params: deleteUserParams}>('/delete/:email', async (request, reply) => {
    console.log('🎯 Route /delete/:email called');
    const token = request.cookies.jwt_transcendence;
    if (!token)
      return (reply.status(230).send({ error: "0403"}));
    const tokenPayload = getTokenData(token);
    console.log("[CHECK DATA] =",tokenPayload)
    if (!tokenPayload?.isAdmin && !tokenPayload?.id)
      return (reply.status(230).send({ error: "0403"}));
    const dfa = tokenPayload?.dfa;
    if (!dfa)
      return (reply.status(230).send({ error: "1020" }));
    //sql delete avec email
    const user = await server.pg.query('SELECT * FROM delete_user($1)', [request.params.email]);
    if (!user)
      return reply.status(230).send({ error: "1006" });
    reply.send({ response: "user deleted" });
  });


  done();
}