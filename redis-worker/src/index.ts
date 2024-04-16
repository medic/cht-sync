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
      const data = await redisClient.lRange(config.redis.key!, 0, config.batchSize - 1);
      if (data.length === 0) {
        console.log('No data in queue, waiting...');
        await new Promise(resolve => setTimeout(resolve, 1000 * 10)); // 10 seconds
        continue;
      }

      await updatePostgrest(data);
      console.log('Data processed:', data);

      const removedCount = await redisClient.lTrim(config.redis.key!, config.batchSize, -1);
      console.log(`Updated ${data.length} items to PostgREST, removed ${removedCount} from queue.`);
    }
  } catch (error) {
    console.error('Error processing data:', error);
  } finally {
    await redisClient.quit();
  }
}

export async function updatePostgrest(data: string[]) {
  console.log('called with', data)
  const formattedData = data.map(item => JSON.parse(item));
  
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await axios.post(config.postgrest.url, formattedData);
      return;
    } catch (error) {
      console.error(`Error updating PostgREST on attempt ${attempt + 1}:`, error);
    }
  }

  console.error('Failed to update PostgREST after 3 attempts');
}

if (require.main === module) {
  main();
}
