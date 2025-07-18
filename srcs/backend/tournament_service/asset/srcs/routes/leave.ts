
import { FastifyInstance } from 'fastify';
import { broadcastDashboardUpdate, broadcastTournamentUpdate } from '../websocket';

export default function leaveTournament(server: FastifyInstance) {
  server.post<{ Params: { name: string }; Body: { user_id: number } }>('/:name/leave', async (request, reply) => {
    const { name } = request.params;
    const { user_id } = request.body;

    if (!name || typeof user_id !== 'number') {
      return reply.status(400).send({ success: false, msg: 'Missing tournament name or user_id' });
    }

    const client = await server.pg.connect();
    try {
      const tourRes = await client.query('SELECT id FROM tournaments WHERE name = $1', [name]);
      if (tourRes.rows.length === 0) {
        return reply.status(404).send({ success: false, msg: 'Tournament not found' });
      }
      const tournamentId = tourRes.rows[0].id;

      // Call the SQL function to leave the tournament
      await client.query('SELECT * FROM leave_tournament($1::INTEGER, $2::TEXT)', [user_id, name]);

      // Broadcast updates to all relevant clients
      await broadcastTournamentUpdate(server, tournamentId, client);
      await broadcastDashboardUpdate(server, client);

      return reply.send({ success: true, msg: 'Successfully left the tournament.' });
    } catch (err) {
      console.error('Error in /:name/leave:', err);
      return reply.status(500).send({ success: false, msg: 'Internal server error' });
    } finally {
      client.release();
    }
  });
}
