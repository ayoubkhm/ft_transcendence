import { FastifyInstance } from "fastify";
import validateUserData from "../utils/userData";
import { i_token, getTokenData } from "../utils/getTokenData";
import isConnected from "../JWT/jsonwebtoken"

export default async function friendsRoutes(server: FastifyInstance, options: any, done: any) {
    interface postUserFriendRequestParams { id: number }

    //Cette route POST /api/user/friends/requests/:id te permet d’envoyer une demande d’ami à un autre user, dont l’ID est passé en paramètre :id. Voilà comment ça marche, étape par étape
    // Send a friend request from the authenticated user to :id
    server.post<{ Params: postUserFriendRequestParams }>('/friends/requests/:id', async (request, reply) => {
        try {
            const targetID = Number(request.params.id);
            const token = request.cookies['jwt_transcendence'];
            if (!token) {
                return reply.code(401).send({ error: 'Not authenticated' });
            }
            const userId = getTokenData(token).id;
            if (!userId) {
                return reply.code(400).send({ error: 'Invalid user' });
            }
            if (userId === targetID) {
                return reply.code(400).send({ error: 'Cannot friend yourself' });
            }
            // Verify target exists
            const targetRes = await server.pg.query('SELECT 1 FROM users WHERE id = $1', [targetID]);
            // If no rows returned, user does not exist
            if ((targetRes.rowCount ?? 0) === 0) {
                return reply.code(404).send({ error: 'User not found' });
            }
            // Check existing friendship
            const friendRes = await server.pg.query(
              `SELECT 1 FROM friends
               WHERE (user1_id = $1 AND user2_id = $2)
                  OR (user1_id = $2 AND user2_id = $1)`,
              [userId, targetID]
            );
            if ((friendRes.rowCount ?? 0) > 0) {
                return reply.code(409).send({ error: 'Already friends' });
            }
            const inviteRes = await server.pg.query(
              `SELECT 1 FROM invites
               WHERE type = 'friend'
                 AND ((from_id = $1 AND to_id = $2)
                      OR (from_id = $2 AND to_id = $1))`,
              [userId, targetID]
            );
            if ((inviteRes.rowCount ?? 0) > 0) {
                return reply.code(409).send({ error: 'Friend request already pending' });
            }
            // Insert new invite request
            await server.pg.query(
              `INSERT INTO invites (from_id, to_id, type) VALUES ($1, $2, 'friend')`,
              [userId, targetID]
            );
            return reply.send({ success: true, msg: 'Friend request sent' });
        } catch (err) {
            request.log.error(err);
            return reply.code(500).send({ error: 'Internal server error' });
        }
    });

    //sert a accepter la demande dajout en ami
    interface acceptUserFriendRequestParams {id: string}

    server.put<{Params:acceptUserFriendRequestParams}>('/friends/requests/:id', async (request, reply) => {
        try {
            const requestID = Number(request.params.id);
            const token = request.cookies['jwt_transcendence'];
            if (!token)
                return reply.status(230).send({ error: "0403" });
            const id = getTokenData(token).id;
            if (!id)
                return reply.status(230).send({ error: "0404" });
            if (isNaN(requestID))
                return reply.status(230).send({ error: "0404" });
            const inviteRes = await server.pg.query(
                'SELECT 1 FROM invites WHERE from_id = $1 AND to_id = $2 AND type = \'friend\'',
                [requestID, id]
            );
            if ((inviteRes.rowCount ?? 0) === 0)
                return reply.status(230).send({ error: "0404" });
            // Call integer-based new_friends overload to create the friendship
            const friendRes = await server.pg.query(
                'SELECT * FROM new_friends($1::int, $2::int)',
                [id, requestID]
            );
            const { success, msg } = friendRes.rows[0];
            if (!success)
                return reply.status(230).send({ error: msg });
            await server.pg.query(
                'DELETE FROM invites WHERE from_id = $1 AND to_id = $2 AND type = \'friend\'',
                [requestID, id]
            );
            return reply.send({ success: true, msg });
        } catch (error) {
            request.log.error(error);
            return reply.status(230).send({ error: "0500" });
        }
    });

    //sert a delete la demande dajout dami dun user
    interface acceptUserFriendRequestParams {id: string}

    server.delete<{Params:acceptUserFriendRequestParams}>('/friends/requests/:id', async (request, reply) => {
        try {
            const requestID = Number(request.params.id);
            const token = request.cookies['jwt_transcendence'];
            if (!token)
                return reply.status(230).send({ error: "0403" });
            const id = getTokenData(token).id;
            if (!id)
                return reply.status(230).send({ error: "0404" });
            if (isNaN(requestID))
                return reply.status(230).send({ error: "0404" });
            const inviteRes = await server.pg.query(
                'SELECT 1 FROM invites WHERE from_id = $1 AND to_id = $2 AND type = \'friend\'',
                [id, requestID]
            );
            if ((inviteRes.rowCount ?? 0) === 0)
                return reply.status(230).send({ error: "0404" });
            await server.pg.query(
                'DELETE FROM invites WHERE from_id = $1 AND to_id = $2 AND type = \'friend\'',
                [id, requestID]
            );
            return reply.send({ success: true, msg: 'Friend request rejected' });
        } catch (error) {
            request.log.error(error);
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
                return reply.status(230).send({ error: "0401" });
            const user = await server.pg.query(`SELECT * FROM get_friends(${id})`);
            if (!user.rows[0].success)
                return reply.status(230).send({ error: "0404" });
            reply.send(user.rows[0].user_friends); 
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
            console.log("ID", id);
            const targetID = Number(request.params.id);
            console.log("ID", targetID);
            if (!id || !targetID)
                return reply.status(230).send({ error: "0403" });
            if (id === targetID)
                return reply.status(230).send({ error: "0404" });
            const delFriends= await server.pg.query(`SELECT * FROM delete_friends(${id}, ${targetID})`);
            if (!delFriends.rows[0].success)
                reply.status(230).send({ error: "0404" });
            reply.status(200).send();
        } catch (error) {
            return reply.status(230).send({ error: "0500" });
        }
    });

    //tt la liste dami de la prsonne connecter
    // GET /api/user/friends: list all friends of the current user
    server.get('/friends', async (request: any, reply: any) => {
        try {
            const token = request.cookies['jwt_transcendence'];
            if (!token) {
                return reply.code(401).send({ error: 'Not authenticated' });
            }
            const userId = getTokenData(token).id;
            if (!userId) {
                return reply.code(401).send({ error: 'Invalid token' });
            }
            const sql = `
              SELECT u.id, u.name
              FROM friends f
              JOIN users u ON
                (f.user1_id = $1 AND u.id = f.user2_id)
                OR (f.user2_id = $1 AND u.id = f.user1_id)
            `;
            const { rows } = await server.pg.query(sql, [userId]);
            return reply.send(rows);
        } catch (err) {
            request.log.error(err);
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });

    //tt la liste des demande dami
    // GET /api/user/receivedFriendRequests: list incoming friend requests for the current user
    server.get('/receivedFriendRequests', async (request: any, reply: any) => {
        try {
            const token = request.cookies['jwt_transcendence'];
            if (!token) {
                return reply.code(401).send({ error: 'Not authenticated' });
            }
            const userId = getTokenData(token).id;
            if (!userId) {
                return reply.code(401).send({ error: 'Invalid token' });
            }
            const sql = `
              SELECT u.id, u.name
              FROM invites p
              JOIN users u ON p.from_id = u.id
              WHERE p.to_id = $1 AND p.type = 'friend'
            `;
            const { rows } = await server.pg.query(sql, [userId]);
            return reply.send(rows);
        } catch (err) {
            request.log.error(err);
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });

    server.get('/friends/status/:id', async (request: any, reply: any) => {
        try {
            const token = request.cookies['jwt_transcendence'];
            if (!token) {
                return reply.code(401).send({ error: 'Not authenticated' });
            }
            const userId = getTokenData(token).id;
            const targetId = Number(request.params.id);

            if (!userId || !targetId) {
                return reply.code(400).send({ error: 'Invalid user ID' });
            }

            // Check if they are friends
            const friendRes = await server.pg.query(
                `SELECT 1 FROM friends WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)`,
                [userId, targetId]
            );
            if ((friendRes.rowCount ?? 0) > 0) {
                return reply.send({ status: 'friends' });
            }

            // Check for a pending friend request
            const inviteRes = await server.pg.query(
                `SELECT 1 FROM invites WHERE from_id = $1 AND to_id = $2 AND type = 'friend'`,
                [userId, targetId]
            );
            if ((inviteRes.rowCount ?? 0) > 0) {
                return reply.send({ status: 'pending_sent' });
            }

            return reply.send({ status: 'none' });
        } catch (err) {
            request.log.error(err);
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });

    done();
}