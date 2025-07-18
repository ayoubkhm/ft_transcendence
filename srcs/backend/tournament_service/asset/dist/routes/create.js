"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = createTournament;
const websocket_1 = require("../websocket");
function createTournament(server) {
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
}
