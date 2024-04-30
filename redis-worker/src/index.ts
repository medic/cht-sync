import axios from 'axios';
import { createClient } from 'redis';
import config from './config';

async function connectToRedis(redisClient: any) {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error(`Error connecting to redis with url redis://${config.redis.host}:${config.redis.port}:`, error);
    throw error;
  }
}

async function getDataFromRedis(redisClient: any) {
  const data = await redisClient.lRange(config.redis.key as string, 0, config.batchSize - 1);
  if (data.length === 0) {
    console.log('No data in queue, waiting...');
    await new Promise(resolve => setTimeout(resolve, 1000 * 10)); // 10 seconds
  }
  return data;
}

async function updateData(data: any, redisClient: any) {
  const update = await updatePostgrest(data);
  if (update?.status === 201) {
    await redisClient.lTrim(config.redis.key as string, config.batchSize, -1);
    console.log(`Updated ${data.length} items to PostgREST and removed them from the queue.`);
  } else {
    console.error('Failed to update PostgREST:', update?.data);
  }
}

export async function main() {
  const redisClient = createClient({ 
    url: `redis://${config.redis.host}:${config.redis.port}`
   });

   await connectToRedis(redisClient);

  try {
    while (true) {
      const data = await getDataFromRedis(redisClient);
      if (data.length > 0) {
        await updateData(data, redisClient);
      }
    }
  } catch (error) {
    console.error('Error processing data:', error);
  } finally {
    await redisClient.quit();
  }
}


export async function updatePostgrest(data: string[]) {
  const formattedData = data
    .map(item => JSON.parse(item))
    .filter(item => item.doc !== undefined);
  
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
