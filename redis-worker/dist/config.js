"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const config = {
    redis: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        key: process.env.REDIS_KEY,
    },
    postgrest: {
        url: `http://${process.env.POSTGREST_ENDPOINT}/medic`, // TODO: Make this dynamic to handle multiple DBs
    },
    batchSize: parseInt((_a = process.env.BATCH_SIZE) !== null && _a !== void 0 ? _a : '100', 10),
};
exports.default = config;
