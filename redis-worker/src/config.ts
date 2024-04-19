import dotenv from 'dotenv';

dotenv.config();

const config = {
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    key: process.env.REDIS_KEY,
  },
  postgrest: {
    url: `http://${process.env.POSTGREST_ENDPOINT}/medic`,
  },
  batchSize: parseInt(process.env.REDIS_BATCH_SIZE ?? '100', 10),
};

export default config;
