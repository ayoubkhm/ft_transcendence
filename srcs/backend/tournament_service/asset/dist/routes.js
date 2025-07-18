"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = httpRoutes;
const websocket_1 = require("./websocket");
function httpRoutes(server) {
    server.post('/', async (request, reply) => {
        const { name, owner_id } = request.body;
        if (!name || typeof owner_id !== 'number')
            return reply.status(400).send({ success: false, msg: 'Missing or invalid name/owner_id' });
        const client = await server.pg.connect();
        try {
            const result = await client.query('SELECT * FROM new_tournament($1::TEXT, $2::INTEGER)', [name, owner_id]);
            if (result.rows.length === 0)
                return reply.status(500).send({ success: false, msg: 'Tournament creation failed' });
            await (0, websocket_1.broadcastDashboardUpdate)(server, client);
            return reply.send(result.rows[0]);
        }
        catch (err) {
            console.error('Error in POST /:', err);
            return reply.status(500).send({ success: false, msg: 'Internal server error' });
        }
        finally {
            client.release();
        }
    });
    server.post('/:name/start', async (request, reply) => {
        const { name } = request.params;
        if (!name)
            return reply.status(400).send({ success: false, msg: 'Missing tournament name' });
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
            await (0, websocket_1.broadcastTournamentUpdate)(server, tournamentId, client);
            await (0, websocket_1.broadcastDashboardUpdate)(server, client);
            return reply.send(result.rows[0]);
        }
        catch (err) {
            console.error('Error in /:name/start:', err);
            return reply.status(500).send({ success: false, msg: 'Internal server error' });
        }
        finally {
            client.release();
        }
    });
    server.delete('/:name', async (request, reply) => {
        const { name } = request.params;
        if (!name)
            return reply.status(400).send({ error: 'Missing tournament name' });
        const client = await server.pg.connect();
        try {
            const tournamentRes = await client.query('SELECT id FROM tournaments WHERE name = $1', [name]);
            if (tournamentRes.rows.length === 0)
                return reply.status(404).send({ error: 'Tournament not found' });
            const tournamentId = tournamentRes.rows[0].id;
            const result = await client.query('SELECT * FROM delete_tournament($1::TEXT)', [name]);
            if (result.rows.length === 0)
                return reply.status(500).send({ error: 'Unexpected error during deletion' });
            await (0, websocket_1.broadcastTournamentUpdate)(server, tournamentId, client);
            await (0, websocket_1.broadcastDashboardUpdate)(server, client);
            return reply.send(result.rows[0]);
        }
        catch (err) {
            console.error('Error in DELETE /:name:', err);
            return reply.status(500).send({ error: 'Internal server error' });
        }
        finally {
            client.release();
        }
    });
    server.post('/game/end', async (request, reply) => {
        const { gameId, winnerId, p1_score, p2_score } = request.body;
        if (!gameId || !winnerId || p1_score === undefined || p2_score === undefined)
            return reply.status(400).send({ success: false, msg: 'Missing required game data.' });
        const client = await server.pg.connect();
        try {
            const gameQuery = await client.query('SELECT tournament_id, p1_id FROM games WHERE id = $1', [gameId]);
            if (gameQuery.rows.length === 0)
                return reply.status(404).send({ success: false, msg: 'Game not found.' });
            const { tournament_id, p1_id } = gameQuery.rows[0];
            await client.query(`UPDATE games SET state = 'OVER', winner = ($1 = $2), p1_score = $3, p2_score = $4 WHERE id = $5`, [winnerId, p1_id, p1_score, p2_score, gameId]);
            await client.query(`SELECT * FROM next_round($1::INTEGER)`, [tournament_id]);
            await (0, websocket_1.broadcastTournamentUpdate)(server, tournament_id, client);
            await (0, websocket_1.broadcastDashboardUpdate)(server, client);
            return reply.send({ success: true, msg: 'Tournament updated successfully.' });
        }
        catch (err) {
            console.error('Error in /game/end:', err);
            return reply.status(500).send({ success: false, msg: 'Internal server error' });
        }
        finally {
            client.release();
        }
    });
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
            return reply.send({ success: true, data: tournament });
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
