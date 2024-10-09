import chai from 'chai';
import chaiExclude from 'chai-exclude';
chai.use(chaiExclude);
chai.use(chaiExclude);
import { rootConnect } from './utils/postgres-utils.js';
import {
  importAllDocs,
  docs,
  reports,
  contacts,
  persons,
} from './utils/couchdb-utils.js';

const {
  POSTGRES_SCHEMA,
  DBT_POSTGRES_SCHEMA: pgSchema,
  POSTGRES_TABLE,
} = process.env;

const PGTABLE = `${POSTGRES_SCHEMA}.${POSTGRES_TABLE}`;

const delay = (seconds) => new Promise(resolve => setTimeout(resolve, seconds * 1000));

const waitForDbt = async (pgClient, retry = 30) => {
  if (retry <= 0) {
    throw new Error('DBT models missing records after 30s');
  }

  try {
    const dbtReports = await pgClient.query(`SELECT * FROM ${pgSchema}.reports`);
    const dbtContacts = await pgClient.query(`SELECT * FROM ${pgSchema}.contacts`);
    if (dbtReports.rows.length === reports().length && dbtContacts.rows.length === contacts().length) {
      return;
    }
  } catch {
    // not done yet
  }

  await delay(1);
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

  describe('Initial Sync', () => {
    it('should have data in postgres medic table', async () => {
      const couchdbTableResult = await client.query(`SELECT * FROM ${PGTABLE}`);
      expect(couchdbTableResult.rows.length).to.equal(docs.length);
    });

    it('should have data in postgres contacts table', async () => {
      const contactsTableResult = await client.query(`SELECT * FROM ${pgSchema}.contacts`);
      expect(contactsTableResult.rows.length).to.equal(contacts().length);
    });

    it('should have data in postgres reports table', async () => {
      const reportsTableResult = await client.query(`SELECT * FROM ${pgSchema}.reports`);
      expect(reportsTableResult.rows.length).to.equal(reports().length);
    });

    it('should have data in postgres persons table', async () => {
      const personsTableResult = await client.query(`SELECT * FROM ${pgSchema}.persons`);
      expect(personsTableResult.rows.length).to.equal(persons().length);
    });

    it('should have the expected data in a record in contact table', async () => {
      const contact = contacts().at(0);
      const contactTableResult = await client.query(`SELECT * FROM ${pgSchema}.contacts where uuid=$1`, [contact._id]);
      expect(contactTableResult.rows.length).to.equal(1);
      expect(contactTableResult.rows[0]).to.deep.include({
        parent_uuid: contact.parent._id,
        name: contact.name,
        contact_type: contact.type,
        phone: contact.phone
      });
    });

    it('should have the expected data in a record in person table', async () => {
      const person = persons().at(0);
      const personTableResult = await client.query(`SELECT * FROM ${pgSchema}.persons where uuid=$1`, [person._id]);
      expect(personTableResult.rows.length).to.equal(1);
      expect(personTableResult.rows[0].date_of_birth).to.equal(person.date_of_birth);
      expect(personTableResult.rows[0].sex).to.equal(person.sex);
    });

    it('should have the expected data in a record in reports table', async () => {
      const report = reports().at(0);
      const reportTableResult = await client.query(`SELECT * FROM ${pgSchema}.reports where uuid=$1`, [report._id]);
      expect(reportTableResult.rows.length).to.equal(1);
      expect(reportTableResult.rows[0].doc).excluding(['_rev', '_id']).to.deep.equal(report);
      expect(reportTableResult.rows[0].form).to.equal(report.form);
      expect(reportTableResult.rows[0].patient_id).to.equal(report.patient_id);
      expect(reportTableResult.rows[0].contact_id).to.equal(report.contact._id);
      expect(reportTableResult.rows[0].fields).to.deep.equal(report.fields);
    });
  });
});
