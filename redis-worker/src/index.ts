import axios from 'axios';
import { createClient } from 'redis';
import config from './config';

export async function main() {
  const redisClient = createClient({ 
    url: `redis://${config.redis.host}:${config.redis.port}`
   });

  try {
    await redisClient.connect();
  } catch (error) {
    console.error(`Error connecting to redis with url redis://${config.redis.host}:${config.redis.port}:`, error);
  }

  try {
    while (true) {
      const data = await redisClient.lRange(config.redis.key as string, 0, config.batchSize - 1);
      if (data.length === 0) {
        console.log('No data in queue, waiting...');
        await new Promise(resolve => setTimeout(resolve, 1000 * 10)); // 10 seconds
        continue;
      }

      const update = await updatePostgrest(data);

      if (update?.status === 201) {
        await redisClient.lTrim(config.redis.key as string, config.batchSize, -1);
        console.log(`Updated ${data.length} items to PostgREST and removed them from the queue.`);
        continue;
      } else {
        console.error('Failed to update PostgREST:', update?.data);
        continue;
      }
    }
  } catch (error) {
    console.error('Error processing data:', error);
  } finally {
    await redisClient.quit();
  }
}

export async function updatePostgrest(data: string[]) {
  const formattedData = data.map(item => JSON.parse(item));
  
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await axios.post(config.postgrest.url, formattedData);
      return response;
    } catch (error) {
      console.error(`Error updating PostgREST on attempt ${attempt + 1}:`, error);
    }
  }

  console.error('Failed to update PostgREST after 3 attempts');
}

if (require.main === module) {
  main();
}
