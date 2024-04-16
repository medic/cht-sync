"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const redis_1 = require("redis");
const config_1 = __importDefault(require("./config"));
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const redisClient = (0, redis_1.createClient)({
            url: `redis://${config_1.default.redis.host}:${config_1.default.redis.port}`
        });
        try {
            yield redisClient.connect();
        }
        catch (error) {
            console.error(`Error connecting to redis with url redis://${config_1.default.redis.host}:${config_1.default.redis.port}:`, error);
        }
        try {
            while (true) {
                const data = yield redisClient.lRange(config_1.default.redis.key, 0, config_1.default.batchSize - 1);
                if (data.length === 0) {
                    console.log('No data in queue, waiting...');
                    yield new Promise(resolve => setTimeout(resolve, 1000 * 10)); // 10 seconds
                    continue;
                }
                yield updatePostgrest(data);
                const removedCount = yield redisClient.lTrim(config_1.default.redis.key, config_1.default.batchSize, -1);
                console.log(`Updated ${data.length} items to PostgREST, removed ${removedCount} from queue.`);
            }
        }
        catch (error) {
            console.error('Error processing data:', error);
        }
        finally {
            yield redisClient.quit();
        }
    });
}
function updatePostgrest(data) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Data:', data);
        const formattedData = data.map(item => JSON.parse(item));
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                console.log('Updating PostgREST:', formattedData);
                yield axios_1.default.post(config_1.default.postgrest.url, formattedData);
                return; // If the request is successful, we exit the function here
            }
            catch (error) {
                console.error(`Error updating PostgREST on attempt ${attempt + 1}:`, error);
            }
        }
        console.error('Failed to update PostgREST after 3 attempts');
    });
}
main();
