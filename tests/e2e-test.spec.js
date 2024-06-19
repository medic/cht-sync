import { rootConnect } from './utils/postgres-utils.js';
import { importAllDocs, docs, dataRecords, contacts, editDoc } from './utils/couchdb-utils.js';
const {
  POSTGRES_SCHEMA,
  DBT_POSTGRES_SCHEMA,
  POSTGRES_TABLE,
} = process.env;

const PGTABLE = `${POSTGRES_SCHEMA}.${POSTGRES_TABLE}`;

const delay = (seconds) => new Promise(resolve => setTimeout(resolve, seconds * 1000));

const waitForDbt = async (pgClient, retry = 30) => {
  if (retry <= 0) {
    throw new Error('DBT models missing records after 30s');
  }

  try {
    const dbtDataRecords = await pgClient.query(`SELECT * FROM ${DBT_POSTGRES_SCHEMA}.reports`);
    const expectedDataRecords = dataRecords().length;

    const dbtPersons = await pgClient.query(`SELECT * FROM ${DBT_POSTGRES_SCHEMA}.contacts`);
    const expectedContacts = contacts().length;

    if (dbtDataRecords.rows.length === expectedDataRecords && dbtPersons.rows.length === expectedContacts) {
      return;
    }
  } catch {
    // not done yet
  }

  await new Promise(r => setTimeout(r, 1000));
  return waitForDbt(pgClient, --retry);
};

describe('Main workflow Test Suite', () => {
  let client;

  before(async () => {
    console.log('Importing docs');
    await importAllDocs();
    client = await rootConnect();
    console.log('Waiting for DBT');
    await waitForDbt(client);
  });

  after(async () => await client?.end());

  it('should have data in postgres medic table', async () => {
    const couchdbTableResult = await client.query(`SELECT * FROM ${PGTABLE}`);
    expect(couchdbTableResult.rows.length).to.equal(docs.length);
  });

  it('should have data in postgres person table', async () => {
    const personTableResult = await client.query(`SELECT * FROM ${DBT_POSTGRES_SCHEMA}.contacts`);
    expect(personTableResult.rows.length).to.equal(contacts().length);
  });

  it('should have data in postgres data_record table', async () => {
    const dataRecordTableResult = await client.query(`SELECT * FROM ${DBT_POSTGRES_SCHEMA}.reports`);
    expect(dataRecordTableResult.rows.length).to.equal(dataRecords().length);
  });

  it('should process document edits', async () => {
    await editDoc({ ...docs[0], edited: 1 });
    await editDoc({ ...docs[2], edited: 1 });

    await delay(6);

    const doc0result = await client.query(`SELECT * from ${PGTABLE} where _id = $1`, [docs[0]._id]);
    expect(doc0result.rows[0].doc.edited).to.equal(1);
  });

  it('should process document deletes', async () => {

  });
});
