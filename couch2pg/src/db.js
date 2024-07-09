const { COUCHDB_SECURE, COUCHDB_USER, COUCHDB_PASSWORD, COUCHDB_HOST, COUCHDB_PORT, COUCHDB_DBS } = process.env;
const
  {
    POSTGRES_SCHEMA,
    POSTGRES_TABLE,
    POSTGRES_USER,
    POSTGRES_PASSWORD,
    POSTGRES_HOST,
    POSTGRES_DB,
    POSTGRES_PORT
  } = process.env;

const PG_OPTS = {
  user: POSTGRES_USER,
  password: POSTGRES_PASSWORD,
  host: POSTGRES_HOST,
  port: POSTGRES_PORT,
  database: POSTGRES_DB,
};

import PouchDb from 'pouchdb-core';
import http from 'pouchdb-adapter-http';
import session from 'pouchdb-session-authentication';

PouchDb.plugin(http);
PouchDb.plugin(session);

import pg from 'pg';

export const postgresTable = `${POSTGRES_SCHEMA}.${POSTGRES_TABLE}`;
export const postgresProgressTable = `${POSTGRES_SCHEMA}.couchdb_progress`;
export const postgresSchema = POSTGRES_SCHEMA;

export const getPgClient = async () => {
  const client = new pg.Client(PG_OPTS);
  await client.connect();
  return client;
};

export const getCouchDbClient = (dbName) => {
  dbName = dbName || COUCHDB_DBS;
  const url = `${COUCHDB_SECURE === 'true' ? 'https' : 'http'}://${COUCHDB_USER}:${COUCHDB_PASSWORD}@${COUCHDB_HOST}:${COUCHDB_PORT}/${dbName}`;
  return new PouchDb(url, { skip_setup: true });
};

export const couchDbs = COUCHDB_DBS.split(',').map(db => db.trim());
