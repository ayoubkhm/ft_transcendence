import { FastifyInstance } from 'fastify';
import { broadcastTournamentUpdate } from './websocket';

export default async function gameFlowRoutes(server: FastifyInstance) {
  server.post<{
    Body: {
      gameId: number;
      winnerId: number;
      p1_score: number;
      p2_score: number;
    };
  }>('/game/end', async (request, reply) => {
    const { gameId, winnerId, p1_score, p2_score } = request.body;
    
    console.log(`[Game End] Received notification for game ${gameId}. Winner: ${winnerId}`);

    const client = await server.pg.connect();
    try {
      const res = await client.query(
        'SELECT * FROM end_game($1::INTEGER, $2::INTEGER, $3::INTEGER, $4::INTEGER)',
        [gameId, winnerId, p1_score, p2_score]
      );

      const { success, msg, tournament_id } = res.rows[0];

      if (success) {
        console.log(`[Game End] Game ${gameId} successfully ended. Broadcasting update for tournament ${tournament_id}.`);
        await broadcastTournamentUpdate(server, tournament_id, client);
      } else {
        console.error(`[Game End] Failed to end game ${gameId}: ${msg}`);
      }
      
      reply.send({ success, message: msg });
    } catch (err) {
      console.error('[Game End] Error processing game result:', err);
      reply.status(500).send({ success: false, message: 'Internal server error.' });
    } finally {
      client.release();
    }
  });
}

