
import { FastifyInstance } from 'fastify';
import { broadcastDashboardUpdate, broadcastTournamentUpdate } from '../websocket';

export default function endGame(server: FastifyInstance) {
  server.post<{ Body: { gameId: number; winnerId: number; p1_score: number; p2_score: number; } }>('/game/end', async (request, reply) => {
      const { gameId, winnerId, p1_score, p2_score } = request.body;
      if (!gameId || !winnerId || p1_score === undefined || p2_score === undefined)
        return reply.status(400).send({ success: false, msg: 'Missing required game data.' });
      const client = await server.pg.connect();
      try {
        const gameQuery = await client.query('SELECT tournament_id, p1_id FROM games WHERE id = $1', [gameId]);
        if (gameQuery.rows.length === 0)
          return reply.status(404).send({ success: false, msg: 'Game not found.' });
        const { tournament_id, p1_id } = gameQuery.rows[0];
        await client.query(
          `UPDATE games SET state = 'OVER', winner = ($1 = $2), p1_score = $3, p2_score = $4 WHERE id = $5`,
          [winnerId, p1_id, p1_score, p2_score, gameId]
        );
        await client.query(`SELECT * FROM next_round($1::INTEGER)`, [tournament_id]);
        await broadcastTournamentUpdate(server, tournament_id, client);
        await broadcastDashboardUpdate(server, client);
        return reply.send({ success: true, msg: 'Tournament updated successfully.' });
      } catch (err) {
        console.error('Error in /game/end:', err);
        return reply.status(500).send({ success: false, msg: 'Internal server error' });
      } finally {
        client.release();
      }
  });
}
