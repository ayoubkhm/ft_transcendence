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
            return reply.status(400).send({ error: 'Invalid user identifier' });
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


    























    // DELETE user par le mail si il nest pas admin
    interface deleteUserParams {email: string}

    server.delete<{Params: deleteUserParams}>('/delete/:email', async (request, reply) => {
        console.log('🎯 Route /delete/:email called');
        const token = request.cookies.jwt_transcendence;
        if (!token)
        return (reply.status(230).send({ error: "0403"}));
        const tokenPayload = getTokenData(token);
        console.log("[CHECK DATA] =",tokenPayload)
        if (!tokenPayload?.admin && !tokenPayload?.id)
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