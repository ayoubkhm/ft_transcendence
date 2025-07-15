// @ts-ignore
import { FastifyInstance } from 'fastify';

export default async function bracketsRoute(server: FastifyInstance)
{
	// @ts-ignore
	server.get<{Params: {id: string}}>('/brackets/:id', async (request, reply) =>
	{
		const id: number = Number(request.params.id);
		console.log("brackets for id: ", id);
		try
		{
			const res = await server.pg.query(`SELECT * FROM get_brackets(${id});`);
			if (!(res[0].success))
				request.log.warn('Brackets error: %s', res[0].msg);
			return reply.send({
				success: res[0].success,
				msg: res[0].msg,
				brackets: res[0].brackets
			});
		}
		catch (err)
		{
            request.log.error(err);
            return reply.status(500).send({
                success: false,
                msg: 'Internal server error (query failed)',
                brackets: [],
            });
		}
	});
}
