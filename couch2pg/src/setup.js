const db = require('./db');

const createSchema = `CREATE SCHEMA IF NOT EXISTS ${db.postgresSchema}`;
const createTable = `
CREATE TABLE IF NOT EXISTS ${db.postgresTable} (
  "@timestamp" TIMESTAMP,
  _id varchar,
  _rev int,
  doc jsonb,
  UNIQUE (_id, _rev)
)
`;

const createProgressTable = `
CREATE TABLE IF NOT EXISTS ${db.postgresProgressTable} (
  seq varchar, 
  source varchar not null,
  UNIQUE (source)
);`;

const createDatabase = async () => {
  const client = await db.getPgClient();
  await client.query(createSchema);
  await client.query(createTable);
  await client.query(createProgressTable);
  await client.end();
};

module.exports = {
  createDatabase,
};
