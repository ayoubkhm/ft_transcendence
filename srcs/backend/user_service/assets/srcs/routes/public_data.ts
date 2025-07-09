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
        const isEmail = value.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/);
        const isID = value.match(/^[0-9]$/);
        let user = null;
        if (isEmail)
            user = await server.pg.query(`SELECT * FROM get_public($1)`, [value])
        else if (isID)
            user = await server.pg.query(`SELECT * FROM get_public($1)`, [Number(value)])
        if (!user)
            return reply.status(230).send({ error: "1006" });
        reply.send(user);
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


    done();
}