import PouchDb from 'pouchdb-core';
import http from 'pouchdb-adapter-http';
import { promises as fs } from 'node:fs';
import path from 'path';

PouchDb.plugin(http);

const env = process.env;

export const dbNames = env.COUCHDB_DBS.split(',');
const dbUrl = name => `http://127.0.0.1:${env.COUCHDB_PORT}/${name}`;

export const docs = [];

const loadDocs = async () => {
  const dir = path.join(import.meta.dirname, '..', 'data', 'json_docs');
  for (const file of await fs.readdir(dir)) {
    const data = await fs.readFile(path.join(dir, file), 'utf-8');
    docs.push(JSON.parse(data));
  }
};

const importDocs = async (dbName) => {
  const db = new PouchDb(dbUrl(dbName), { auth: { username: env.COUCHDB_USER, password: env.COUCHDB_PASSWORD, skip_setup: false } });

  const dbDocs = docs.map(doc => ({  ...doc, _id: `${dbName}-${doc._id}` }));
  while (dbDocs.length) {
    const batch = dbDocs.splice(0, 1000);
    await db.bulkDocs(batch);
  }
};

export const importAllDocs = async () => {
  await loadDocs();
  for (const dbName of dbNames) {
    await importDocs(dbName);
  }
};

export const dataRecords = () => docs.filter(doc => doc.type === 'data_record');
export const persons = () => docs.filter(doc => doc.type === 'person');
