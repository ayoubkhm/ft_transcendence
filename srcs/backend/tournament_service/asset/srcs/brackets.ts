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
			const row = res.rows[0];
			if (!(row.success))
				request.log.warn('Brackets error: %s', row.msg);
			return reply.send({
				success: row.success,
				msg: row.msg,
				tname: row.tname,
				tstate: row.tstate,
				twinner: row.twinner,
				twinner_name: row.twinner_name,
				twinner_tag: row.twinner_tag,
				brackets: row.brackets
			});
		}
		catch (err)
		{
            request.log.error(err);
            return reply.status(500).send({
                success: false,
				// @ts-ignore
                msg: 'Internal server error (query failed): ' + (err?.message || err),
                brackets: [],
				twinner: null,
				tname: null,
				tstate: null,
				twinner_name: null,
				twinner_tag: null,
            });
		}
	});
}
