"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = getTournament;
function getTournament(server) {
    server.get('/:id', async (request, reply) => {
        const { id } = request.params;
        const client = await server.pg.connect();
        try {
            const tournamentRes = await client.query('SELECT t.id, t.state, t.name, t.nbr_players, t.max_players, t.owner_id, u.name as owner_name FROM tournaments t JOIN users u ON t.owner_id = u.id WHERE t.id = $1', [id]);
            if (tournamentRes.rows.length === 0) {
                return reply.status(404).send({ success: false, msg: 'Tournament not found' });
            }
            const playersRes = await client.query('SELECT u.id, u.name FROM users u JOIN tournaments_players tp ON u.id = tp.player_id WHERE tp.tournament_id = $1', [id]);
            const tournament = {
                ...tournamentRes.rows[0],
                players: playersRes.rows,
            };
            return reply.send(tournament);
        }
        catch (err) {
            console.error(`Error in GET /:id:`, err);
            return reply.status(500).send({ success: false, msg: 'Internal server error' });
        }
        finally {
            client.release();
        }
    });
}
