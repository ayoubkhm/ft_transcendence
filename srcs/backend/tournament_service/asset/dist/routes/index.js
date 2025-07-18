"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = httpRoutes;
const create_1 = __importDefault(require("./create"));
const get_1 = __importDefault(require("./get"));
const start_1 = __importDefault(require("./start"));
const delete_1 = __importDefault(require("./delete"));
const endGame_1 = __importDefault(require("./endGame"));
const leave_1 = __importDefault(require("./leave"));
function httpRoutes(server, options, done) {
    (0, create_1.default)(server);
    (0, get_1.default)(server);
    (0, start_1.default)(server);
    (0, delete_1.default)(server);
    (0, endGame_1.default)(server);
    (0, leave_1.default)(server);
    done();
}
