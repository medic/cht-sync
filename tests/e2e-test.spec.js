import { rootConnect } from './postgres-utils.js';
const {
  POSTGRES_SCHEMA,
  DBT_POSTGRES_SCHEMA,
  POSTGRES_TABLE,
} = process.env;

describe('Main workflow Test Suite', () => {
  let client;

  before(async () => client = await rootConnect());

  after(async () => await client.end());

  it('should have data in postgres medic table', async () => {
    const couchdbTableResult = await client.query('SELECT * FROM ' + POSTGRES_SCHEMA + '.' + POSTGRES_TABLE);
    expect(couchdbTableResult.rows.length).to.be.greaterThan(0);
  });

  it('should have data in postgres person table', async () => {
    const personTableResult = await client.query('SELECT * FROM ' + DBT_POSTGRES_SCHEMA + '.person');
    expect(personTableResult.rows.length).to.be.greaterThan(0);
  });

  it('should have data in postgres data_record table', async () => {
    const dataRecordTableResult = await client.query('SELECT * FROM ' + DBT_POSTGRES_SCHEMA + '.data_record');
    expect(dataRecordTableResult.rows.length).to.be.greaterThan(0);
  });
});
