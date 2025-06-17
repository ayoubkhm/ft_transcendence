"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = registerOAuth;
const oauth2_1 = __importDefault(require("@fastify/oauth2"));
function registerOAuth(app) {
    app.register(oauth2_1.default, {
        name: 'googleOAuth2',
        scope: ['profile', 'email'],
        credentials: {
            client: {
                id: process.env.GOOGLE_CLIENT_ID,
                secret: process.env.GOOGLE_CLIENT_SECRET
            },
            auth: oauth2_1.default.GOOGLE_CONFIGURATION
        },
        startRedirectPath: '/api/auth/login/google',
        callbackUri: process.env.CALLBACK_URL
    });
}
