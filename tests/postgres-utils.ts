import { Client, SSLMode } from "ts-postgres";
import { POSTGRES } from "../scripts/config";

export const rootConnect = async () => connectToDatabase(POSTGRES.db);

const connectToDatabase = async (database: string) => {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: POSTGRES.username,
    password: POSTGRES.password,
    database,
    ssl: SSLMode.Disable,
  });

  await client.connect();
  return client;
};
