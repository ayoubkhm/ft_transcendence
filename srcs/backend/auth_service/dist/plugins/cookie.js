"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = registerCookie;
const cookie_1 = __importDefault(require("@fastify/cookie"));
function registerCookie(app) {
    app.register(cookie_1.default, {
        secret: process.env.COOKIE_SECRET,
        parseOptions: { httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 7 }
    });
}
