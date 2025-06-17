"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = loginRoutes;
async function loginRoutes(app) {
    app.post('/login', async (request, reply) => {
        const { email, password } = request.body;
        if (!email ||
            !password ||
            typeof email !== 'string' ||
            typeof password !== 'string' ||
            !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            return reply.status(400).send({ error: 'Invalid email or password' });
        }
        // ici tu peux comparer contre ta base, bcrypt, etc.
        return { ok: true };
    });
}
