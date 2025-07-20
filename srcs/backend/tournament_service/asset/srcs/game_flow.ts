import { FastifyInstance } from 'fastify';
import { broadcastTournamentUpdate } from './websocket';

export default async function gameFlowRoutes(server: FastifyInstance) {
  server.post<{
    Body: {
      gameId: number;
      winnerSide: boolean;
    };
  }>('/game/end', async (request, reply) => {
    const { gameId, winnerSide } = request.body;
    
    console.log(`[Game End] Received notification for gameId: ${gameId}`);
    console.log(`[Game End]   Winner ID: ${winnerSide}`);
    // console.log(`[Game End]   Scores: P1=${p1_score}, P2=${p2_score}`);

    const client = await server.pg.connect();
    try {
      console.log(`[Game End] Calling win_game(${gameId}, ${winnerSide}) in DB...`);
      const res = await client.query(
        'SELECT * FROM win_game($1::INTEGER, $2::BOOLEAN)',
        [gameId, winnerSide]
      );

      const result = res.rows[0];
      console.log('[Game End] Received from DB:', result);

      if (result.success) {
        console.log(`[Game End] DB call successful. Broadcasting update for tournamentId: ${result.tid}.`);
        await broadcastTournamentUpdate(server, result.tid, client);
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

