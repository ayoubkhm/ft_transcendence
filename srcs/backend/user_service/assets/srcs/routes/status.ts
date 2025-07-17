import { FastifyInstance } from "fastify";

export default async function statusRoutes(server: FastifyInstance, options: any, done: any) {
    interface updateUserStatusBody {
        credential: string;
        userId: number;
        online: boolean;
    }

    server.post<{ Body: updateUserStatusBody }>('/status', async (request, reply) => {
        try {
            const { credential, userId, online } = request.body;

            if (!credential || credential !== process.env.API_CREDENTIAL) {
                return reply.status(401).send({ error: "Unauthorized" });
            }

            if (userId === undefined || online === undefined) {
                return reply.status(400).send({ error: "Missing userId or online status" });
            }

            const { rowCount } = await server.pg.query(
                'UPDATE users SET online = $1 WHERE id = $2',
                [online, userId]
            );

            if (rowCount === 0) {
                return reply.status(404).send({ error: 'User not found' });
            }

            return reply.status(200).send({ success: true });
        } catch (error) {
            request.log.error(error);
            return reply.status(500).send({ error: "Internal server error" });
        }
    });

    done();
}
