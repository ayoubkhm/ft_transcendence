"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
require("dotenv/config");
const auth_1 = __importDefault(require("./routes/auth"));
const login_1 = __importDefault(require("./routes/login"));
const cookie_1 = __importDefault(require("./plugins/cookie"));
const oauth_1 = __importDefault(require("./plugins/oauth"));
const app = (0, fastify_1.default)({ logger: true });
// —–– 1) Cookie plugin (pour ton setCookie dans le callback)
(0, cookie_1.default)(app);
app.register(login_1.default, { prefix: '/api/auth' });
(0, oauth_1.default)(app);
// —–– 3) Tes routes custom (le callback)
app.register(auth_1.default, { prefix: '/api/auth' });
// —–– 4) Démarrage
app.listen({ host: '0.0.0.0', port: 3000 }, err => {
    if (err) {
        app.log.error(err);
        process.exit(1);
    }
    app.log.info('Auth service ready');
});
