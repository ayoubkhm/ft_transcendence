
import { FastifyInstance } from 'fastify';
import { broadcastDashboardUpdate, broadcastTournamentUpdate } from '../websocket';

export default function startTournament(server: FastifyInstance) {
  server.post<{ Params: { name: string } }>('/:name/start', async (request, reply) => {
      const { name } = request.params;
      if (!name) return reply.status(400).send({ success: false, msg: 'Missing tournament name' });
      const client = await server.pg.connect();
      try {
        const tourRes = await client.query('SELECT id, state FROM tournaments WHERE name = $1', [name]);
        if (tourRes.rows.length === 0)
          return reply.status(404).send({ success: false, msg: 'Tournament not found' });
        if (tourRes.rows[0].state !== 'LOBBY')
          return reply.status(409).send({ success: false, msg: 'Tournament has already started or is finished.' });
        const tournamentId = tourRes.rows[0].id;
        const result = await client.query('SELECT * FROM start_tournament($1::TEXT)', [name]);
        if (result.rows.length === 0 || !result.rows[0].success)
          return reply.status(500).send({ success: false, msg: 'Start tournament failed' });
        await broadcastTournamentUpdate(server, tournamentId, client);
        await broadcastDashboardUpdate(server, client);
        return reply.send(result.rows[0]);
      } catch (err) {
        console.error('Error in /:name/start:', err);
        return reply.status(500).send({ success: false, msg: 'Internal server error' });
      } finally {
        client.release();
      }
  });
}
