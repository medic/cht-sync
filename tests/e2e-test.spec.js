import chai from 'chai';
import { v4 as uuidv4 } from 'uuid';
import chaiExclude from 'chai-exclude';
chai.use(chaiExclude);
import { rootConnect } from './utils/postgres-utils.js';
import { importAllDocs, docs, dbNames, dataRecords, persons, addDoc } from './utils/couchdb-utils.js';
const {
  POSTGRES_SCHEMA,
  DBT_POSTGRES_SCHEMA,
  POSTGRES_TABLE,
} = process.env;

const waitForDbt = async (pgClient, retry = 100) => {
  if (retry <= 0) {
    throw new Error('DBT models missing records after 50s');
  }

  try {
    const dbtDataRecords = await pgClient.query(`SELECT * FROM ${DBT_POSTGRES_SCHEMA}.data_record`);
    const expectedDataRecords = dataRecords().length * dbNames.length;

    const dbtPersons = await pgClient.query(`SELECT * FROM ${DBT_POSTGRES_SCHEMA}.person`);
    const expectedPersons = persons().length * dbNames.length;

    if (dbtDataRecords.rows.length === expectedDataRecords && dbtPersons.rows.length === expectedPersons) {
      return;
    }
  } catch {
    // not done yet
  }

  await new Promise(r => setTimeout(r, 1000));
  return waitForDbt(pgClient, --retry);
};

describe('End-to-End Tests for CouchDB to Postgres Sync', () => {
  let client;

  before(async () => {
    console.log('Importing docs');
    await importAllDocs();
    client = await rootConnect();
    console.log('Waiting for DBT');
    await waitForDbt(client);
  });

  after(async () => await client?.end());

  describe('should sync all initial data in postgres medic table', () => {

    it('should sync initial data in postgres medic table', async () => {
      const couchdbTableResult = await client.query(`SELECT * FROM ${POSTGRES_SCHEMA}.${POSTGRES_TABLE}`);
      expect(couchdbTableResult.rows.length).to.equal(docs.length * dbNames.length);
    });

    it('should sync all initial data in postgres person table', async () => {
      const personTableResult = await client.query(`SELECT * FROM ${DBT_POSTGRES_SCHEMA}.person`);
      expect(personTableResult.rows.length).to.equal(persons().length * dbNames.length);
    });

    it('should sync all initial data in postgres data_record table', async () => {
      const dataRecordTableResult = await client.query(`SELECT * FROM ${DBT_POSTGRES_SCHEMA}.data_record`);
      expect(dataRecordTableResult.rows.length).to.equal(dataRecords().length * dbNames.length);
    });

    it('should have the expected data in a record in postgres person table', async () => {
      let person = persons().at(0);
      const personTableResult = await client.query(`SELECT * FROM ${DBT_POSTGRES_SCHEMA}.person where _id='medic-` + person._id + `'`);
      expect(personTableResult.rows.length).to.equal(1);
      expect(personTableResult.rows[0]._id).to.equal('medic-' + person._id);
      expect(personTableResult.rows[0].name).to.equal(person.name);
      expect(personTableResult.rows[0].date_of_birth).to.equal(person.date_of_birth);
      expect(personTableResult.rows[0].phone).to.equal(person.phone);
      expect(personTableResult.rows[0].sex).to.equal(person.sex);
      expect(personTableResult.rows[0].reported_date).to.equal(person.reported_date);
      expect(personTableResult.rows[0].patient_id).to.equal(person.patient_id);
      expect(personTableResult.rows[0].type).to.equal(person.type);
      expect(personTableResult.rows[0].doc).excluding(['_rev', '_id']).to.deep.equal(person);
    });

    it('should have the expected data in a record in postgres data_record table', async () => {
      let data_record = dataRecords().at(0);
      const dataRecordTableResult = await client.query(`SELECT * FROM ${DBT_POSTGRES_SCHEMA}.data_record where _id='medic-` + data_record._id + `'`);
      expect(dataRecordTableResult.rows.length).to.equal(1);
      expect(dataRecordTableResult.rows[0]._id).to.equal('medic-' + data_record._id);
      expect(dataRecordTableResult.rows[0].form).to.equal(data_record.form);
      expect(dataRecordTableResult.rows[0].reported_date.toString()).to.equal(data_record.reported_date.toString());
      expect(dataRecordTableResult.rows[0].patient_id).to.equal(data_record.patient_id);
      expect(dataRecordTableResult.rows[0].type).to.equal(data_record.type);
      expect(dataRecordTableResult.rows[0].doc).excluding(['_rev', '_id']).to.deep.equal(data_record);
    });
  });

  describe.only('should sync continuous data correctly', async () => {
    it('should sync incremental inserts, with no redundant data processing.', async () => {
      let newPerson = persons().at(0);
      let _id = uuidv4();
      console.log("New uuid: " + _id);
      await addDoc({ ...newPerson, _id: _id }, 'medic');
      await new Promise(r => setTimeout(r, 6000));
      const couchdbTableResult = await client.query(`SELECT * FROM ${POSTGRES_SCHEMA}.${POSTGRES_TABLE}`);
      expect(couchdbTableResult.rows.length).to.equal((docs.length * dbNames.length) + 1);
      await new Promise(r => setTimeout(r, 6000));
      const personTableResult = await client.query(`SELECT * FROM ${DBT_POSTGRES_SCHEMA}.person where _id='` + _id + `'`);
      expect(personTableResult.rows.length).to.equal(1);
      //TODO verify cht-sync logs. Only one new process.
    });

  });
});
