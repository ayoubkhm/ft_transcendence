
import { FastifyInstance } from 'fastify';
import { broadcastDashboardUpdate, broadcastTournamentUpdate } from '../websocket';

export default function deleteTournament(server: FastifyInstance) {
  server.delete<{ Params: { name: string } }>('/:name', async (request, reply) => {
      const { name } = request.params;
      if (!name) return reply.status(400).send({ error: 'Missing tournament name' });
      const client = await server.pg.connect();
      try {
        const tournamentRes = await client.query('SELECT id FROM tournaments WHERE name = $1', [name]);
        if (tournamentRes.rows.length === 0)
          return reply.status(404).send({ error: 'Tournament not found' });
        const tournamentId = tournamentRes.rows[0].id;
        const result = await client.query('SELECT * FROM delete_tournament($1::TEXT)', [name]);
        if (result.rows.length === 0)
          return reply.status(500).send({ error: 'Unexpected error during deletion' });
        await broadcastTournamentUpdate(server, tournamentId, client); 
        await broadcastDashboardUpdate(server, client);
        return reply.send(result.rows[0]);
      } catch (err) {
        console.error('Error in DELETE /:name:', err);
        return reply.status(500).send({ error: 'Internal server error' });
      } finally {
        client.release();
      }
  });
}
