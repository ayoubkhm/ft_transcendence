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
    
    console.log(`[Game End] Received notification for gameId: ${gameId}`);
    console.log(`[Game End]   Winner ID: ${winnerId}`);
    console.log(`[Game End]   Scores: P1=${p1_score}, P2=${p2_score}`);

    const client = await server.pg.connect();
    try {
      console.log(`[Game End] Calling end_game(${gameId}, ${winnerId}, ${p1_score}, ${p2_score}) in DB...`);
      const res = await client.query(
        'SELECT * FROM end_game($1::INTEGER, $2::INTEGER, $3::INTEGER, $4::INTEGER)',
        [gameId, winnerId, p1_score, p2_score]
      );

      const result = res.rows[0];
      console.log('[Game End] Received from DB:', result);

      if (result.success) {
        console.log(`[Game End] DB call successful. Broadcasting update for tournamentId: ${result.tournament_id}.`);
        await broadcastTournamentUpdate(server, result.tournament_id, client);
        console.log('[Game End] Broadcast complete.');
      } else {
        console.error(`[Game End] DB call failed for game ${gameId}. Reason: ${result.msg}`);
      }
      
      reply.send({ success: result.success, message: result.msg });
    } catch (err) {
      console.error(`[Game End] FATAL: Error processing game result for game ${gameId}:`, err);
      reply.status(500).send({ success: false, message: 'Internal server error.' });
    } finally {
      client.release();
      console.log(`[Game End] DB client released for game ${gameId}.`);
    }
  });
}

