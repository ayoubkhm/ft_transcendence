import { FastifyInstance } from "fastify";
import  validateUserData from "../utils/userData";
import {i_token, getTokenData } from "../utils/getTokenData";
import isConnected from "../JWT/jsonwebtoken"

export default function public_userRoutes (server: FastifyInstance, options: any, done: any)
{
    //SEARCH par get un user par mail ou id
    //JE PENSE FAUT CRER UNE TABLE USER AVEC LES INFOS QUON PEUT DIVULGER
    //A TESTERRR
    interface getUserParams {email: string}

    server.get<{Params: getUserParams}>('/search/:email', async (request, reply) => {
        const value = request.params.email;
        // Determine whether to call by email or by ID
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        const isID = /^\d+$/.test(value);
        if (!isEmail && !isID) {
            return reply.status(400).send({ error: 'Invalid user request.params.id' });
        }
        // Fetch public profile, unwrapping composite to JSON via correct overload
        let sql: string;
        let params: unknown[];
        if (isEmail) {
          // Call text overload for email
          sql = `
            SELECT t.success,
                   t.msg,
                   to_json(t.friend) AS profile
            FROM get_public($1::text) AS t
          `;
          params = [value];
        } else {
          // Call integer overload for ID
          sql = `
            SELECT t.success,
                   t.msg,
                   to_json(t.friend) AS profile
            FROM get_public($1::int) AS t
          `;
          params = [Number(value)];
        }
        const result = await server.pg.query(sql, params);
        const row = result.rows[0];
        if (!row) {
            return reply.status(404).send({ error: 'User not found' });
        }
        // row: { success: boolean, msg: string, friend: { id, name, tag, email, avatar } }
        return reply.send(row);
    });



interface PrivateDataParams {
      id: string;
    }

    interface PrivateDataBody {
      credential?: string;
    }

  server.get<{ Params: PrivateDataParams, Body: PrivateDataBody }>('/lookup/stats/:id', async (request, reply) => {
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
  
  const isID = /^\d+$/.test(request.params.id);
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(request.params.id);
  // if (token) {
  //   let tokData;
  //   try {
  //     tokData = getTokenData(token);
  //   } catch {
  //     return reply.status(403).send({ error: 'Forbidden' });
  //   }
  //   if (isEmail) {
  //     if (tokData.email !== request.params.id && !tokData.admin) {
  //       return reply.status(403).send({ error: 'Forbidden' });
  //     }
  //   } else if (isID) {
  //     if (tokData.id !== Number(request.params.id) && !tokData.admin) {
  //       return reply.status(403).send({ error: 'Forbidden' });
  //     }
  //   } else {
  //     if (tokData.name !== request.params.id && !tokData.admin) {
  //       return reply.status(403).send({ error: 'Forbidden' });
  //     }
  //   }
  // }
  if (token) {
    try {
      getTokenData(token); // juste pour valider le token
    } catch {
      return reply.status(403).send({ error: 'Forbidden' });
    }
  }

  try {
    let result;
    if (isID) {
      result = await server.pg.query(`SELECT * FROM get_stats($1)`, [Number(request.params.id)]);
    } else if (isEmail) {
      result = await server.pg.query(`SELECT * FROM get_stats($1)`, [request.params.id]);
    } else {
      console.error("Lookup stats: bad input: ", request.params.id);
      return reply.status(404).send({ error: 'User not found (bad input)'});
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

    // DELETE user par le mail si il nest pas admin
    interface deleteUserParams {email: string}

    server.delete<{Params: deleteUserParams}>('/delete/:email', async (request, reply) => {
        const token = request.cookies.jwt_transcendence;
        if (!token)
        return (reply.status(403).send({ success: false, error: "No token provided"}));
        const tokenPayload = getTokenData(token);
        if (!tokenPayload || !tokenPayload.id || !tokenPayload.email)
            return (reply.status(403).send({ success: false, error: "Invalid token payload"}));
        const dfa = tokenPayload?.dfa;
        if (!dfa)
            return (reply.status(403).send({ success: false, error: "2FA not validated" }));

        // Security check: allow deletion if user is admin OR is deleting their own account
        if (!tokenPayload.admin && tokenPayload.email !== request.params.email) {
            return reply.status(403).send({ success: false, error: "Forbidden: You can only delete your own account." });
        }

        try {
            const result = await server.pg.query('SELECT success, msg FROM delete_user($1)', [request.params.email]);
            
            if (result.rows.length > 0 && result.rows[0].success) {
                reply.clearCookie('jwt_transcendence', { path: '/' });
                return reply.send({ success: true, message: result.rows[0].msg });
            } else {
                const message = result.rows.length > 0 ? result.rows[0].msg : 'User not found or could not be deleted.';
                if (message.includes('violates foreign key constraint "tournaments_owner_id_fkey"')) {
                    return reply.status(409).send({ success: false, error: 'You cannot delete your account because you are the owner of a tournament. Please delete the tournament first.' });
                }
                return reply.status(404).send({ success: false, error: message });
            }
        } catch (err: any) {
            console.error('Error during user deletion:', err);
            return reply.status(500).send({ success: false, error: 'Internal server error' });
        }
    });

    



    server.get<{ Params: { suggestion: string }, Reply: { success: boolean; msg: string; suggestions: { id: number; name: string; tag: number }[] } }>('/suggest/:suggestion', async (request, reply) =>
    {
        const input = request.params.suggestion;

        try
        {
        // Fetch suggestions, converting composite array to JSON array
        const sql = `
          SELECT t.success,
                 t.msg,
                 array_to_json(t.suggestions) AS suggestions
          FROM suggest_users($1) AS t
        `;
        const { rows } = await server.pg.query(sql, [input]);
        const row = rows[0];
        if (!row.success) {
            // Log but still return empty suggestions
            request.log.warn('Suggest error: %s', row.msg);
        }
        return reply.send({
            success: row.success,
            msg: row.msg,
            // suggestions is now a JSON array of { id, name }
            suggestions: row.suggestions || [],
        });
        }
        catch (error)
        {
            request.log.error(error);
            return reply.status(500).send({
                success: false,
                msg: 'Internal server error (query failed)',
                suggestions: [],
            });
        }
    });



    done();
}