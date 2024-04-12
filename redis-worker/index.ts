const { createClient } = require('redis');
const axios = require('axios');

const REDIS_HOST = process.env.REDIS_HOST;
const REDIS_PORT = process.env.REDIS_PORT;
const REDIS_LIST_KEY = process.env.REDIS_KEY;
const POSTGREST_URL = `http://${process.env.POSTGREST_ENDPOINT}/v1/medic`; // TODO: Make this dynamic to handle multiple DBs
const BATCH_SIZE = 100; // TODO: read this from env variable

async function main() {
  const redisClient = createClient({ host: REDIS_HOST, port: REDIS_PORT });
  console.log('connecting')
  await redisClient.connect();

  try {
    while (true) {
      const data = await redisClient.lRange(REDIS_LIST_KEY, 0, BATCH_SIZE - 1);
      if (data.length === 0) {
        console.log('No data in queue, waiting...');
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second
        continue;
      }

      await updatePostgrest(data);

      const removedCount = await redisClient.lTrim(REDIS_LIST_KEY, BATCH_SIZE, -1);
      console.log(`Updated ${data.length} items to PostgREST, removed ${removedCount} from queue.`);
    }
  } catch (error) {
    console.error('Error processing data:', error);
  } finally {
    await redisClient.quit();
  }
}

async function updatePostgrest(data: string[]) {
  const formattedData = data.map(item => JSON.parse(item));
  try {
    await axios.post(POSTGREST_URL, formattedData);
  } catch (error) {
    console.error('Error updating PostgREST:', error);
    // TODO: Implement retry logic or error handling
  }
}

main();
