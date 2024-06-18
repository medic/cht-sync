import * as db from './db.js';

const createSchema = `CREATE SCHEMA IF NOT EXISTS ${db.postgresSchema}`;
const createTable = `
CREATE TABLE IF NOT EXISTS ${db.postgresTable} (
  "@timestamp" TIMESTAMP,
  _id VARCHAR PRIMARY KEY,
  _deleted BOOLEAN,
  doc jsonb
)`;

const createProgressTable = `
CREATE TABLE IF NOT EXISTS ${db.postgresProgressTable} (
  seq varchar, 
  source varchar PRIMARY KEY  
);`;

const createDeleteIndex = `
CREATE INDEX IF NOT EXISTS _deleted ON ${db.postgresTable}(_deleted);
`;

export const createDatabase = async () => {
  const client = await db.getPgClient();
  await client.query(createSchema);
  await client.query(createTable);
  await client.query(createDeleteIndex);
  await client.query(createProgressTable);
  await client.end();
};
