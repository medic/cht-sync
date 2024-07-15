import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(import.meta.dirname, '..', '.e2e-env') });

import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

chai.config.includeStack = true;
chai.use(chaiAsPromised);

global.expect = chai.expect;

export const rootConnect = async () => connectToDatabase(process.env.POSTGRES_DB);

const connectToDatabase = async (database) => {
  const client = new pg.Client({
    host: 'localhost',
    port: process.env.POSTGRES_PORT,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database,
  });

  await client.connect();
  return client;
};
