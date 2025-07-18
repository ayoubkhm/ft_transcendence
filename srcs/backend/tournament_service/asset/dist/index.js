"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const postgres_1 = __importDefault(require("@fastify/postgres"));
const websocket_1 = __importDefault(require("@fastify/websocket"));
require("dotenv/config");
const brackets_1 = __importDefault(require("./brackets"));
const routes_1 = __importDefault(require("./routes"));
const websocket_2 = __importDefault(require("./websocket"));
const server = (0, fastify_1.default)();
// --- Plugin Registration ---
server.register(postgres_1.default, { connectionString: process.env.DATABASE_URL });
server.register(websocket_1.default);
// --- Route Registration ---
server.register(brackets_1.default, { prefix: '/api/tournaments' });
server.register(routes_1.default, { prefix: '/api/tournaments' });
server.register(websocket_2.default);
// --- Server Start ---
server.listen({ port: 3000, host: '0.0.0.0' })
    .then((address) => {
    console.log(`🚀 Tournament service listening at ${address}`);
})
    .catch((err) => {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
});
