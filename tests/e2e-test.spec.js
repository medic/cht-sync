import chai from 'chai';
import { v4 as uuidv4 } from 'uuid';
import chaiExclude from 'chai-exclude';
chai.use(chaiExclude);
chai.use(chaiExclude);
import { rootConnect, isPostgresConnectionAlive } from './utils/postgres-utils.js';
import {
  importAllDocs,
  docs,
  reports,
  contacts,
  persons,
  insertDocs,
  editDoc,
  deleteDoc,
  conflictEditDoc,
  conflictDeleteDoc
} from './utils/couchdb-utils.js';
import { stopService, isServiceRunning, startService } from './utils/docker-utils.js';

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

  describe('Downtime handles', () => {
    after(async () => {
      const isAlive = await isPostgresConnectionAlive(client);
      if (!isAlive) {
        client = await rootConnect();
      }
    });

    it('should handle CouchDB downtime gracefully', async () => {
      stopService('couchdb');
      await delay(5);
      const isStopped = !isServiceRunning('couchdb');
      expect(isStopped).to.be.true;
      startService('couchdb');
      await delay(15); // Wait for CouchDB
      const isRunning = isServiceRunning('couchdb');
      expect(isRunning).to.be.true;
      await delay(15); // Wait for DBT
      const couchdbTableResult = await client.query(`SELECT * FROM ${PGTABLE}`);
      expect(couchdbTableResult.rows.length).to.equal(docs.length);
      const contactsTableResult = await client.query(`SELECT * FROM ${pgSchema}.contacts`);
      expect(contactsTableResult.rows.length).to.equal(contacts().length);
      const reportsTableResult = await client.query(`SELECT * FROM ${pgSchema}.reports`);
      expect(reportsTableResult.rows.length).to.equal(reports().length);
      const personsTableResult = await client.query(`SELECT * FROM ${pgSchema}.persons`);
      expect(personsTableResult.rows.length).to.equal(persons().length);
    });

    it('should handle PostgreSQL downtime gracefully', async () => {
      await client?.end();
      stopService('postgres');
      await delay(5);
      const isStopped = !isServiceRunning('postgres');
      expect(isStopped).to.be.true;

      const newDoc = {
        _id: uuidv4(),
        type: 'contact',
        name: 'New Contact During PG Down',
        phone: '1234567890',
        parent: { _id: uuidv4() },
      };

      await insertDocs([newDoc]);
      startService('postgres');
      await delay(15); // Wait for Postgres
      const isRunning = isServiceRunning('postgres');
      expect(isRunning).to.be.true;
      await delay(6); // Wait for DBT

      client = await rootConnect();
      const modelNewDocResult = await client.query(`SELECT * FROM ${pgSchema}.contacts where uuid = $1`, [newDoc._id]);
      expect(modelNewDocResult.rows.length).to.equal(1);
      expect(modelNewDocResult.rows[0].name).to.equal(newDoc.name);
    });
  });

  describe('Incremental sync', () => {
    it('should process document edits', async () => {
      const report = reports()[0];
      const contact = contacts()[0];

      expect(contact.type).to.equal('person');

      await editDoc({ ...report, edited: 1 });
      await editDoc({ ...contact, edited: 1 });

      await delay(6); // wait for CHT-Sync

      const pgTableDataRecord = await client.query(`SELECT * from ${PGTABLE} where _id = $1`, [report._id]);
      expect(pgTableDataRecord.rows[0].doc.edited).to.equal(1);

      const pgTableContact = await client.query(`SELECT * from ${PGTABLE} where _id = $1`, [contact._id]);
      expect(pgTableContact.rows[0].doc.edited).to.equal(1);

      await delay(12); // wait for DBT

      const modelReportResult = await client.query(`SELECT * FROM ${pgSchema}.reports where uuid = $1`, [report._id]);
      expect(modelReportResult.rows[0].doc.edited).to.equal(1);

      const modelContactResult = await client.query(`SELECT * FROM ${pgSchema}.contacts where uuid= $1`, [contact._id]);
      expect(modelContactResult.rows[0].edited).to.equal('1');

      const modelPersonResult = await client.query(`SELECT * FROM ${pgSchema}.persons where uuid = $1`, [contact._id]);
      expect(modelPersonResult.rows[0].edited).to.equal('1');

      const contactsTableResult = await client.query(`SELECT * FROM ${pgSchema}.contacts`);
      expect(contactsTableResult.rows.length).to.equal(contacts().length);

      const reportsTableResult = await client.query(`SELECT * FROM ${pgSchema}.reports`);
      expect(reportsTableResult.rows.length).to.equal(reports().length);
    });

    it('should process contact deletes', async () => {
      const contact = contacts()[0];
      await deleteDoc(contact);
      await delay(6); // wait for CHT-Sync
      const pgTableContact = await client.query(`SELECT * from ${PGTABLE} where _id = $1`, [contact._id]);
      expect(pgTableContact.rows[0]._deleted).to.equal(true);
      await delay(6); // wait for DBT
      const modelContactResult = await client.query(`SELECT * FROM ${pgSchema}.contacts where uuid= $1`, [contact._id]);
      expect(modelContactResult.rows.length).to.equal(0);
    });

    it('should process person deletes', async () => {
      const person = persons().find(person => !person._deleted);

      const preDelete = await client.query(`SELECT * FROM ${pgSchema}.persons where uuid = $1`, [person._id]);
      expect(preDelete.rows.length).to.equal(1);

      await deleteDoc(person);
      await delay(6); // wait for CHT-Sync
      await delay(12); // wait for DBT

      const modelContactResult = await client.query(`SELECT * FROM ${pgSchema}.contacts where uuid = $1`, [person._id]);
      expect(modelContactResult.rows.length).to.equal(0);

      const postDelete = await client.query(`SELECT * FROM ${pgSchema}.persons where uuid = $1`, [person._id]);
      expect(postDelete.rows.length).to.equal(0);
    });

    it('should process report deletes', async () => {
      const report = reports()[0];
      await deleteDoc(report);
      await delay(6); // wait for CHT-Sync
      await delay(6); // wait for DBT
      const pgTableReport = await client.query(`SELECT * from ${PGTABLE} where _id = $1`, [report._id]);
      expect(pgTableReport.rows[0]._deleted).to.equal(true);
      const modelReportResult = await client.query(`SELECT * FROM ${pgSchema}.reports where uuid = $1`, [report._id]);
      expect(modelReportResult.rows.length).to.equal(0);
    });

    it('should process incremental inserts', async () => {
      const newDoc = {
        _id: uuidv4(),
        type: 'contact',
        name: 'New Contact',
        phone: '1234567890',
        parent: { _id: uuidv4() },
      };

      await insertDocs([newDoc]);
      await delay(6); // wait for CHT-Sync
      await delay(12); // wait for DBT

      const pgTableNewDoc = await client.query(`SELECT * from ${PGTABLE} where _id = $1`, [newDoc._id]);
      expect(pgTableNewDoc.rows.length).to.equal(1);
      const modelNewDocResult = await client.query(`SELECT * FROM ${pgSchema}.contacts where uuid = $1`, [newDoc._id]);
      expect(modelNewDocResult.rows.length).to.equal(1);
      expect(modelNewDocResult.rows[0].name).to.equal(newDoc.name);
    });
  });

  describe('Conflict resolution', () => {
    it('should handle update conflicts', async () => {
      const contact = contacts()[2];

      const editedContactA = { ...contact, edited: 'A' };
      const editedContactB = { ...contact, edited: 'B' };

      await editDoc(editedContactA);
      await delay(1);
      await conflictEditDoc(editedContactB);

      await delay(6); // wait for CHT-Sync

      const pgTableContact = await client.query(`SELECT * from ${PGTABLE} where _id = $1`, [contact._id]);
      const resolvedValue = pgTableContact.rows[0].doc.edited;
      expect(resolvedValue).to.equal('A');

      await delay(12); // wait for DBT

      const modelContactResult = await client.query(`SELECT * FROM ${pgSchema}.contacts where uuid= $1`, [contact._id]);
      expect(modelContactResult.rows[0].edited).to.equal(resolvedValue);
    });

    it('should handle delete conflicts', async () => {
      const contact = contacts()[2];

      const editedContact = { ...contact, edited: 'edited' };

      await editDoc(editedContact);
      await delay(1);
      await conflictDeleteDoc(contact);

      await delay(6); // wait for CHT-Sync

      const pgTableContact = await client.query(`SELECT * from ${PGTABLE} where _id = $1`, [contact._id]);
      expect(pgTableContact.rows[0]._deleted).to.equal(false);

      await delay(12); // wait for DBT

      const modelContactResult = await client.query(`SELECT * FROM ${pgSchema}.contacts where uuid= $1`, [contact._id]);
      expect(modelContactResult.rows.length).to.equal(1);
    });
  });
});
