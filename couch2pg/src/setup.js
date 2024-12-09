import * as db from './db.js';

const createSchema = `CREATE SCHEMA IF NOT EXISTS ${db.postgresSchema}`;

const createTable = `
CREATE TABLE IF NOT EXISTS ${db.postgresTable} (
  saved_timestamp TIMESTAMP,
  _id VARCHAR PRIMARY KEY,
  _deleted BOOLEAN,
  doc jsonb
)`;

const createProgressTable = `
CREATE TABLE IF NOT EXISTS ${db.postgresProgressTable} (
  seq varchar,
  pending integer,
  updated_at timestamptz,
  source varchar PRIMARY KEY
);`;

const createDeleteIndex = `
CREATE INDEX IF NOT EXISTS _deleted ON ${db.postgresTable}(_deleted);
`;

const createTimestampIndex = `
CREATE INDEX IF NOT EXISTS saved_timestamp ON ${db.postgresTable}(saved_timestamp);
`;


const checkTableExists = async (client) => {
  const tableExists = `SELECT 1 FROM ${db.postgresTable} LIMIT 1;`;

  try {
    await client.query(tableExists);
    return true;
  } catch (error) {
    // "Undefined table" error code in PostgreSQL
    if (error.code === '42P01') {
      return false;
    }
    throw error;
  }
};

export const createDatabase = async () => {
  const client = await db.getPgClient();
  await client.query(createSchema);

  // create the table and indexes if they don't exist
  // note that `CREATE INDEX IF NOT EXISTS` acquires a lock
  // even if the index exists, so cannot rely on it here,
  // have to actually check if the table exists in a separate query
  const tableExists = await checkTableExists(client);
  if (!tableExists) {
    await client.query(createTable);
    await client.query(createDeleteIndex);
    await client.query(createTimestampIndex);
  }

  await client.query(createProgressTable);
  await client.end();
};
