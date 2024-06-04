const BATCH_SIZE = process.env.BATCH_SIZE || 1000;

import * as db from './db.js';

const SELECT_SEQ_STMT = `SELECT seq FROM ${db.postgresProgressTable} WHERE source = $1`;
const INSERT_SEQ_STMT = `INSERT INTO ${db.postgresProgressTable}(seq, source) VALUES ($1, $2)`;
const UPDATE_SEQ_STMT = `UPDATE ${db.postgresProgressTable} SET seq = $1 WHERE source = $2`;
const INSERT_DOCS_STMT = `INSERT INTO ${db.postgresTable} ("@timestamp", _id, _rev, doc) VALUES`;
const ON_CONFLICT_STMT = 'ON CONFLICT (_id, _rev) DO NOTHING';

const sanitise = (string) => {
  // PostgreSQL doesn't support \u0000 in JSON strings, see:
  //   https://www.postgresql.org/message-id/E1YHHV8-00032A-Em@gemulon.postgresql.org

  // This is true for both actual 1 byte 0x00 values, as well as 6 byte
  // '\u0000' ones. Because '\\u0000u0000' would be replaced as '\u0000', we
  // also aggressively remove any concurrent slashes as well
  return string.replace(/(\\+u0000)|\u0000/g, ''); // eslint-disable-line
};

const removeSecurityDetails = (doc) => {
  const isUserDoc = doc && doc.type === 'user' && doc._id.startsWith('org.couchdb.user:');
  if (isUserDoc) {
    delete doc.password_scheme;
    delete doc.derived_key;
    delete doc.salt;
  }
};

const getRevNumber = (doc) => doc._rev.split('-')[0];

const getSeq = async (source) => {
  const client = await db.getPgClient();
  const result = await client.query(SELECT_SEQ_STMT, [source]);
  let seq;
  if (!result.rows.length) {
    seq = 0;
    await client.query(INSERT_SEQ_STMT, [seq, source]);
  } else {
    seq = result.rows[0].seq;
  }

  await client.end();
  return seq;
};

const storeSeq = async (seq, source) => {
  const client = await db.getPgClient();
  await client.query(UPDATE_SEQ_STMT, [seq, source]);
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
    docsToInsert.push(now, row.id, getRevNumber(row.doc), sanitise(JSON.stringify(row.doc)));
  });

  return {
    query: `${INSERT_DOCS_STMT} ${insertStmts.join(',')} ${ON_CONFLICT_STMT}`,
    values: docsToInsert,
  };
};

/*
 Downloads all given documents from couchdb and stores them in Postgres, in batches.
 We presume if a document is on this list it has changed, and thus needs updating.
 */
const loadAndStoreDocs = async (couchdb, docsToDownload) => {
  if (!docsToDownload.length) {
    return;
  }

  const docIds = docsToDownload.map(change => change.id);
  const allDocsResult = await couchdb.allDocs({ keys: docIds, include_docs: true });
  console.info('Pulled ' + allDocsResult.rows.length + ' results from couchdb');

  const { query, values } = buildBulkInsertQuery(allDocsResult);

  const client = await db.getPgClient();
  await client.query(query, values);
  await client.end();
};

const deleteDocs = async () => {
  // todo do we even delete docs??
};

const importChangesBatch = async (couchDb, source) => {
  const seq = await getSeq(source);
  console.info('Downloading CouchDB changes feed from ' + seq);

  const changes = await couchDb.changes({ limit: BATCH_SIZE, since: seq, seq_interval: BATCH_SIZE });
  console.log('There are ' + changes.results.length + ' changes to process');

  const docsToDelete = [];
  const docsToDownload = [];
  changes.results.forEach(change => change.deleted ? docsToDelete.push(change) : docsToDownload.push(change));

  console.info('There are ' +
            docsToDelete.length + ' deletions and ' +
            docsToDownload.length + ' new / changed documents');

  await deleteDocs(); // toDo ???
  await loadAndStoreDocs(couchDb, docsToDownload);
  await storeSeq(changes.last_seq, source);

  return changes.results.length;
};

export default async (couchdb) => {
  const info = await couchdb.info();

  let totalDocs = 0;
  let batchDocs = 0;

  do {
    batchDocs = await importChangesBatch(couchdb, info.db_name);
    totalDocs += batchDocs;
  } while (batchDocs);
};

