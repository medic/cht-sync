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
const { createClient } = require('redis');
const axios = require('axios');
const REDIS_HOST = process.env.REDIS_HOST;
const REDIS_PORT = process.env.REDIS_PORT;
const REDIS_LIST_KEY = process.env.REDIS_KEY;
const POSTGREST_URL = `http://${process.env.POSTGREST_ENDPOINT}/medic`; // TODO: Make this dynamic to handle multiple DBs
const BATCH_SIZE = 100; // TODO: read this from env variable
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const redisClient = createClient({
            url: `redis://${REDIS_HOST}:${REDIS_PORT}`
        });
        console.log('connecting', REDIS_HOST, REDIS_PORT);
        try {
            yield redisClient.connect();
            while (true) {
                const data = yield redisClient.lRange(REDIS_LIST_KEY, 0, BATCH_SIZE - 1);
                if (data.length === 0) {
                    console.log('No data in queue, waiting...');
                    yield new Promise(resolve => setTimeout(resolve, 1000 * 60)); // 1 minute
                    continue;
                }
                yield updatePostgrest(data);
                const removedCount = yield redisClient.lTrim(REDIS_LIST_KEY, BATCH_SIZE, -1);
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
        const formattedData = data.map(item => JSON.parse(item));
        try {
            yield axios.post(POSTGREST_URL, formattedData);
        }
        catch (error) {
            console.error('Error updating PostgREST:', error);
            // TODO: Implement retry logic or error handling
        }
    });
}
main();
