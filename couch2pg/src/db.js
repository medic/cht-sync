const { COUCHDB_SECURE, COUCHDB_USER, COUCHDB_PASSWORD, COUCHDB_HOST, COUCHDB_PORT, COUCHDB_DBS } = process.env;
const { POSTGRES_SCHEMA, POSTGRES_TABLE, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_HOST, POSTGRES_DB, POSTGRES_PORT } = process.env;

const PG_OPTS = {
  user: POSTGRES_USER,
  password: POSTGRES_PASSWORD,
  host: POSTGRES_HOST,
  port: POSTGRES_PORT,
  database: POSTGRES_DB,
};
const COUCHDB_URL = `${COUCHDB_SECURE === 'true' ? 'https' : 'http'}://${COUCHDB_USER}:${COUCHDB_PASSWORD}@${COUCHDB_HOST}:${COUCHDB_PORT}/${COUCHDB_DBS}`;

const PouchDb = require('pouchdb-core');
PouchDb.plugin(require('pouchdb-adapter-http'));
PouchDb.plugin(require('pouchdb-session-authentication'));

const pg = require('pg');

const couchDb = new PouchDb(COUCHDB_URL);

const postgresTable = `${POSTGRES_SCHEMA}.${POSTGRES_TABLE}`;
const postgresProgressTable = `${POSTGRES_SCHEMA}.couchdb_progress`;

const getPgClient = async () => {
  const client = new pg.Client(PG_OPTS);
  await client.connect();
  return client;
}

module.exports = {
  getPgClient,
  couchDb,
  postgresSchema: POSTGRES_SCHEMA,
  postgresTable,
  postgresProgressTable,
}
