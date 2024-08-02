const BATCH_SIZE = process.env.BATCH_SIZE || 1000;

import * as db from './db.js';
import axios from 'axios';

const SELECT_SEQ_STMT = `SELECT seq FROM ${db.postgresProgressTable} WHERE source = $1`;
const INSERT_SEQ_STMT = `
  INSERT INTO ${db.postgresProgressTable}
    (seq, pending, source, updated_at)
  VALUES
    ($1, $2, $3, CURRENT_TIMESTAMP)
`;
const UPDATE_SEQ_STMT = `
  UPDATE ${db.postgresProgressTable}
    SET seq = $1, pending = $2, updated_at = CURRENT_TIMESTAMP
  WHERE source = $3
`;
const INSERT_DOCS_STMT = `INSERT INTO ${db.postgresTable} (saved_timestamp, _id, _deleted, doc) VALUES`;
const ON_CONFLICT_STMT = `
ON CONFLICT (_id) DO UPDATE SET
  saved_timestamp = EXCLUDED.saved_timestamp,
  _deleted = EXCLUDED._deleted,
  doc = EXCLUDED.doc
`;

const sanitise = (string) => {
  // PostgreSQL doesn't support \u0000 in JSON strings, see:
  //   https://www.postgresql.org/message-id/E1YHHV8-00032A-Em@gemulon.postgresql.org

  // This is true for both actual 1 byte 0x00 values, as well as 6 byte
  // '\u0000' ones. Because '\\u0000u0000' would be replaced as '\u0000', we
  // also aggressively remove any concurrent slashes as well
  return string?.replace(/(\\+u0000)|\u0000/g, ''); // eslint-disable-line
};

const removeSecurityDetails = (doc) => {
  const isUserDoc = doc && doc.type === 'user' && doc._id.startsWith('org.couchdb.user:');
  if (isUserDoc) {
    delete doc.password_scheme;
    delete doc.derived_key;
    delete doc.salt;
  }
};

const getSeq = async (source) => {
  const client = await db.getPgClient();
  const result = await client.query(SELECT_SEQ_STMT, [source]);
  let seq;
  if (!result.rows.length) {
    seq = 0;
    await client.query(INSERT_SEQ_STMT, [seq, null, source]);
  } else {
    seq = result.rows[0].seq;
  }

  await client.end();
  return seq;
};

const storeSeq = async (seq, pending, source) => {
  const client = await db.getPgClient();
  await client.query(UPDATE_SEQ_STMT, [seq, pending, source]);
  await client.end();
};

const buildBulkInsertQuery = (allDocs) => {
  const now = new Date().toISOString();

  let idx = 1;
  const insertStmts = [];
  const docsToInsert = [];

  allDocs.rows.forEach((row) => {
    removeSecurityDetails(row.doc);
    insertStmts.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++})`);
    docsToInsert.push(now, row.id, !!row.deleted, sanitise(JSON.stringify(row.doc)));
  });

  return {
    query: `${INSERT_DOCS_STMT} ${insertStmts.join(',')} ${ON_CONFLICT_STMT}`,
    values: docsToInsert,
  };
};

const addDeletesToResult = (deletedDocs, allDocs) => {
  const deleteStub = (change) => ({
    id: change.id,
    key: change.id,
    deleted: true,
    doc: { _id: change.id, _rev: change.changes?.[0]?.rev, _deleted: true },
  });
  deletedDocs.forEach(change => allDocs.rows.push(deleteStub(change)));
  return allDocs;
};

/*
 Downloads all given documents from couchdb and stores them in Postgres, in batches.
 We presume if a document is on this list it has changed, and thus needs updating.
 */
const loadAndStoreDocs = async (couchdb, docsToDownload) => {
  if (!docsToDownload.length) {
    return;
  }

  const deletedDocs = docsToDownload.filter(change => change.deleted);
  const docIds = docsToDownload.filter(change => !change.deleted).map(change => change.id);
  const allDocsResult = await couchdb.allDocs({ keys: docIds, include_docs: true });
  console.info('Pulled ' + allDocsResult.rows.length + ' results from couchdb');

  const docsToStore = addDeletesToResult(deletedDocs, allDocsResult);

  await storeDocs(docsToStore);
};

const storeDocs = async (allDocsResult) => {
  let client;
  try {
    const { query, values } = buildBulkInsertQuery(allDocsResult);

    client = await db.getPgClient();
    await client.query(query, values);
    await client.end();
  } catch (err) {
    if (err.code === '40P01') {
      // deadlock detected
      await client.end();
      return storeDocs(allDocsResult);
    }
    throw err;
  }
};

const importChangesBatch = async (couchDb, source) => {
  const seq = await getSeq(source);
  console.info('Downloading CouchDB changes feed from ' + seq);

  let pending;
  try {
    pending = await getPending(couchDb, seq);
  } catch (error) {
    console.error('Error getting pending:', error);
    pending = null;
  }

  const changes = await couchDb.changes({ limit: BATCH_SIZE, since: seq, seq_interval: BATCH_SIZE });
  console.log('There are ' + changes.results.length + ' changes to process');

  const docsToDelete = [];
  const docsToDownload = [];
  changes.results.forEach(change => change.deleted ? docsToDelete.push(change) : docsToDownload.push(change));

  console.info('There are ' +
            docsToDelete.length + ' deletions and ' +
            docsToDownload.length + ' new / changed documents');

  console.log('There are approximately ' + pending + ' changes left');
  await loadAndStoreDocs(couchDb, changes.results);
  await storeSeq(changes.last_seq, pending, source);

  return changes.results.length;
};

const getPending = async (couchDb, seq) => {
  const res = await axios.get(`${couchDb.name}/_changes?limit=0&since=${seq}`);
  if (res.status === 200 && res.data?.pending != null) {
    return res.data.pending;
  }
  return null;
};

export default async (couchdb) => {
  const couchUrl = new URL(couchdb.name);
  const source = `${couchUrl.hostname}${couchUrl.pathname}`;

  let totalDocs = 0;
  let batchDocs = 0;

  do {
    batchDocs = await importChangesBatch(couchdb, source);
    totalDocs += batchDocs;
  } while (batchDocs);

  return totalDocs;
};

