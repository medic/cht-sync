import * as db from './db.js';

const createSchema = `CREATE SCHEMA IF NOT EXISTS ${db.postgresSchema}`;
const createTable = `
CREATE TABLE IF NOT EXISTS ${db.postgresTable} (
  saved_timestamp TIMESTAMP,
  _id VARCHAR PRIMARY KEY,
  _deleted BOOLEAN,
  source varchar,
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
CREATE INDEX CONCURRENTLY IF NOT EXISTS _deleted ON ${db.postgresTable}(_deleted);
`;

const createTimestampIndex = `
CREATE INDEX CONCURRENTLY IF NOT EXISTS saved_timestamp ON ${db.postgresTable}(saved_timestamp);
`;

const createSourceIndex = `
CREATE INDEX CONCURRENTLY IF NOT EXISTS source ON ${db.postgresTable}(source);
`;

export const createDatabase = async () => {
  const client = await db.getPgClient();
  await client.query(createSchema);
  await client.query(createTable);
  await client.query(createDeleteIndex);
  await client.query(createTimestampIndex);
  await client.query(createSourceIndex);
  await client.query(createProgressTable);
  await client.end();
};
