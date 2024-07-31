import PouchDb from 'pouchdb-core';
import http from 'pouchdb-adapter-http';
import { promises as fs } from 'node:fs';
import path from 'path';

PouchDb.plugin(http);

const env = process.env;

export const dbNames = env.COUCHDB_DBS.split(',');
const dbUrl = name => `http://127.0.0.1:${env.COUCHDB_PORT}/${name}`;

export const docs = [];
const docsByDb = {};

const dbs = {};

const loadDocs = async () => {
  const dir = path.join(import.meta.dirname, '..', 'data', 'json_docs');
  for (const file of await fs.readdir(dir)) {
    const data = await fs.readFile(path.join(dir, file), 'utf-8');
    docs.push(JSON.parse(data));
  }
};

const getDb = (dbName) => {
  if (dbs[dbName]) {
    return dbs[dbName];
  }
  const opts = { auth: { username: env.COUCHDB_USER, password: env.COUCHDB_PASSWORD, skip_setup: false } };
  dbs[dbName] = new PouchDb(dbUrl(dbName), opts);
  return dbs[dbName];
};

const importDocs = async (dbName, docs) => {
  const db = getDb(dbName);

  while (docs.length) {
    const batch = docs.splice(0, 1000);
    await db.bulkDocs(batch);
  }
};

export const importAllDocs = async () => {
  await loadDocs();
  const batchSize = Math.ceil(docs.length / dbNames.length);
  const docsCopy = [...docs];
  for (const dbName of dbNames) {
    const batchDocs = docsCopy.splice(0, batchSize);
    docsByDb[dbName] = new Set(batchDocs.map(doc => doc._id));
    await importDocs(dbName, batchDocs);
  }
};

export const reports = () => docs.filter(doc => doc.type === 'data_record');
export const persons = () => docs.filter(doc => doc.type === 'person');
const contactTypes = ['contact', 'clinic', 'district_hospital', 'health_center', 'person'];
export const contacts = () => docs.filter(doc => contactTypes.includes(doc.type));

const getDbByDoc = (id) => Object.keys(docsByDb).filter(dnName => docsByDb[dnName].has(id));

const getOldRevision = async (db, docId) => {
  const doc = await db.get(docId, { revs: true });
  const revisions = doc._revisions;
  if (revisions && revisions.ids.length > 1) {
    return `${revisions.start - 1}-${revisions.ids[1]}`;
  }
  throw new Error('No old revision available');
};

export const insertDocs = async (documents) => {
  docs.push(...documents);
  const db = getDb(dbNames[0]);
  await db.bulkDocs(documents);
};

export const editDoc = async (doc, useOldRev = false) => {
  const dbName = getDbByDoc(doc._id);
  const db = getDb(dbName);

  if (useOldRev) {
    // Simulate conflict by using an old revision
    doc._rev = await getOldRevision(db, doc._id);
  } else {
    // Get the latest revision
    const existentDoc = await db.get(doc._id);
    doc._rev = existentDoc._rev;
  }

  await db.bulkDocs([doc], { new_edits: true });
};

export const deleteDoc = async (doc, useOldRev = false) => {
  doc._deleted = true;
  const dbName = getDbByDoc(doc._id);
  const db = getDb(dbName);

  if (useOldRev) {
    // Simulate conflict by using an old revision
    doc._rev = await getOldRevision(db, doc._id);
  } else {
    // Use the latest revision to prevent conflict
    const existentDoc = await db.get(doc._id);
    doc._rev = existentDoc._rev;
  }

  await db.bulkDocs([{ _id: doc._id, _rev: doc._rev, _deleted: true }], { new_edits: true });
};
