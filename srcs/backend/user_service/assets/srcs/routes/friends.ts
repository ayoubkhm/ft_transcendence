import { FastifyInstance } from "fastify";
import validateUserData from "../utils/userData";
import { i_token, getTokenData } from "../utils/getTokenData";
import isConnected from "../JWT/jsonwebtoken"

export default async function friendsRoutes(server: FastifyInstance, options: any, done: any) {
    interface postUserFriendRequestParams { id: number }

    //Cette route POST /api/user/friends/requests/:id te permet d’envoyer une demande d’ami à un autre user, dont l’ID est passé en paramètre :id. Voilà comment ça marche, étape par étape
    server.post<{ Params: postUserFriendRequestParams }>('/friends/requests/:id', async (request, reply) => {
        try {
            const targetID = Number(request.params?.id);
            const token = request.cookies['jwt_transcendence'];
            if (!token)
                return reply.status(230).send({ error: "user/friends error 0403" });
            const id = getTokenData(token).id;
            if (!id)
                return reply.status(230).send({ error: "user/friends error 0404" });
            const user = await server.pg.query('SELECT * FROM users id = $1', [Number(id)]);
            if (!user)
                return reply.status(230).send({error: "user/friends error 0405"});
            const target = await server.pg.query('SELECT * FROM users id = $1', [targetID]);
            if (!target)
                return reply.status(230).send({error: "user/friends error 0406"});
            //requete deja ami
            //requete demande dami deja envoye
            //sinon tu envoie une demande au target
        } catch (error) {
            return reply.status(230).send({ error: "0500" });
        }
    });

    //sert a accepter la demande dajout en ami
    interface acceptUserFriendRequestParams {id: string}

    server.put<{Params:acceptUserFriendRequestParams}>('/friends/requests/:id', async (request, reply) => {
        try {
            const requestID = request.params?.id;
            const token = request.cookies['jwt_transcendence'];
            if (!token)
                return reply.status(230).send({ error: "user/friends error 0403" });
            const id = getTokenData(token).id;
            if (!id)
                return reply.status(230).send({ error: "user/friends error 0404" });

        } catch (error) {
            return reply.status(230).send({ error: "0500" });
        }
    });

    //sert a delete la demande dajout dami dun user
    interface acceptUserFriendRequestParams {id: string}

    server.delete<{Params:acceptUserFriendRequestParams}>('/friends/requests/:id', async (request, reply) => {
        try {
            const requestID = request.params?.id;
            const token = request.cookies['jwt_transcendence'];
            if (!token)
                return reply.status(230).send({ error: "user/friends error 0403" });
            const id = getTokenData(token).id;
            if (!id)
                return reply.status(230).send({ error: "user/friends error 0404" });

        } catch (error) {
            return reply.status(230).send({ error: "0500" });
        }
    });

    done();
}