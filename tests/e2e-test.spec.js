import { rootConnect } from './utils/postgres-utils.js';
import { importAllDocs, docs, dbNames, dataRecords, persons } from './utils/couchdb-utils.js';
const {
  POSTGRES_SCHEMA,
  DBT_POSTGRES_SCHEMA,
  POSTGRES_TABLE,
} = process.env;

const waitForDbt = async (pgClient, retry = 50) => {
  if (retry <= 0) {
    throw new Error('DBT models missing records after 50s');
  }

  try {
    const dbtDataRecords = await pgClient.query(`SELECT * FROM ${DBT_POSTGRES_SCHEMA}.data_record`);
    const expectedDataRecords = dataRecords().length * dbNames.length;

    const dbtPersons = await pgClient.query(`SELECT * FROM ${DBT_POSTGRES_SCHEMA}.person`);
    const expectedPersons = persons().length * dbNames.length;

    console.log(`Data records: ${dbtDataRecords.rows.length}/${expectedDataRecords}`);
    console.log(`Persons: ${dbtPersons.rows.length}/${expectedPersons}`);
    if (dbtDataRecords.rows.length === expectedDataRecords && dbtPersons.rows.length === expectedPersons) {
      return;
    }
  } catch (error) {
    console.log(error);
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
    const couchdbTableResult = await client.query(`SELECT * FROM ${POSTGRES_SCHEMA}.${POSTGRES_TABLE}`);
    expect(couchdbTableResult.rows.length).to.equal(docs.length * dbNames.length);
  });

  it('should have data in postgres person table', async () => {
    const personTableResult = await client.query(`SELECT * FROM ${DBT_POSTGRES_SCHEMA}.person`);
    expect(personTableResult.rows.length).to.equal(persons().length * dbNames.length);
  });

  it('should have data in postgres data_record table', async () => {
    const dataRecordTableResult = await client.query(`SELECT * FROM ${DBT_POSTGRES_SCHEMA}.data_record`);
    expect(dataRecordTableResult.rows.length).to.equal(dataRecords().length * dbNames.length);
  });
});
