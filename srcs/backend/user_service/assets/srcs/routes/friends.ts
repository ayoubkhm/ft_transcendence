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

    interface getUserFriendsParams {id: string}

    interface getUserFriendsBody {credential: string}
    //routes pour choper la liste d’amis associée au user dont l’ID est passé en paramètre.
    server.post<{Body: getUserFriendsBody, Params: getUserFriendsParams}>('/getFriends/:id', async (request, reply) => {
        try{
            const id = request.params.id;
            const cred = request.body.credential;
            if (!cred || cred != process.env.API_CREDENTIAL)
                return reply.status(230).send({ error: "user/friends error 0401" });
            let user = null; 
            //server.pg.query();
            if (!user)
                return reply.status(230).send({ error: "0404" });
            reply.send(user); 
        } catch (error) {
             return reply.status(230).send({ error: "0500" });
        }
    });

    interface deleteFriendsParams {id: string}

    server.delete<{Params: deleteFriendsParams}>('/friends/:id',  async (request, reply) => {
        try {
            const token = request.cookies['jwt_transcendence'];
            if (!token)
                return reply.status(230).send({ error: "0403" });
            const id = getTokenData(token).id;
            const targetID = request.params.id;
            if (!id || !targetID)
                return reply.status(230).send({ error: "0403" });
            let user = null;
            //server.pg.query pour choper tt les amis de id.
            if (!user)
                return reply.status(230).send({ error: "0404" });
            const userFriends = null;
            //server.pg.query verfier si le id et target id sont amis
            const targetFriends = null;
            //server.pg.query verfier que le target id et ami avec id
            if (!userFriends)
                return reply.status(230).send({ error: "0404" });
            //server.pg.query supprimer la relation entre id et le target
            //if targetfriends exsite supprime la relation entre target et id


            reply.status(200).send();
        } catch (error) {
            return reply.status(230).send({ error: "0500" });
        }
    });

    //tt la liste dami de la prsonne connecter
    server.get('/friends', async (request: any, reply: any) => {
        try {
            const token = request.cookies['ft_transcendence_jw_token'];
            if (!token)
                return reply.status(230).send({ error: "0403" });
            const id = getTokenData(token).id;
            if (!id)
                return reply.status(230).send({ error: "0403" });
            let user = null;
            //requete de liste des amis
            if (!user)
                return reply.status(230).send({ error: "0404" });
            reply.send(user.friends);
        } catch (error) {
            return reply.status(230).send({ error: "0500" });
        }
    });

    //tt la liste des demande dami
    server.get('/receivedFriendRequests', async (request: any, reply: any) => {
        try {
            const token = request.cookies['ft_transcendence_jw_token'];
            if (!token)
                return reply.status(230).send({ error: "0403" });
            const id = getTokenData(token).id;
            if (!id)
                return reply.status(230).send({ error: "0403" });
            let user = null;
            //requete de friend requeste list
            if (!user)
                return reply.status(230).send({ error: "0404" });
            reply.send(user.receivedFriendRequests);
        } catch (error) {
            return reply.status(230).send({ error: "0500" });
        }
    });

    done();
}