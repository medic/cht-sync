import { Client } from 'pg';

export const rootConnect = async () => connectToDatabase(process.env.POSTGRES_DB);

const connectToDatabase = async (database) => {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database,
  });

  await client.connect();
  return client;
};
