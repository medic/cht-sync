import chai from 'chai';
import { v4 as uuidv4 } from 'uuid';
import chaiExclude from 'chai-exclude';
chai.use(chaiExclude);
chai.use(chaiExclude);
import { rootConnect, isPostgresConnectionAlive } from './utils/postgres-utils.js';
import { setupTunnel } from './utils/bastion-utils.js';
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
  POSTGRES_TABLE,
} = process.env;

const PGTABLE = `${POSTGRES_SCHEMA}.${POSTGRES_TABLE}`;

const delay = (seconds) => new Promise(resolve => setTimeout(resolve, seconds * 1000));

const waitForDbt = async (pgClient, retry = 60) => {
  if (retry <= 0) {
    throw new Error('DBT models missing records after 60s');
  }

  try {
    const dbtReports = await pgClient.query(`SELECT * FROM ${POSTGRES_SCHEMA}.reports`);
    const dbtContacts = await pgClient.query(`SELECT * FROM ${POSTGRES_SCHEMA}.contacts`);
    if (dbtReports.rows.length === reports().length && dbtContacts.rows.length === contacts().length) {
      return;
    }
  } catch {
    // not done yet
  }

  await delay(1);
  return waitForDbt(pgClient, --retry);
};

const waitForCondition = async (condition, timeout = 20000, interval = 0.1) => {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return true;
    }
    await delay(interval);
  }
  return false;
};

describe('Main workflow Test Suite', () => {
  let client;
  let sshServer;
  let tunnel;

  before(async () => {
    console.log('Importing docs');
    await importAllDocs();
    console.log('Creating SSH tunnel');
    tunnel = await setupTunnel();
    console.log('Connecting to Postgres');
    client = await rootConnect();
    console.log('Waiting for DBT');
    await waitForDbt(client);
    console.log('Starting main tests');
  });

  /*afterEach(async () => {
    await delay(10);
  });*/

  after(async () => {
    await client?.end();
    [ sshServer ] = tunnel;
    sshServer?.close();
  });

  describe('Initial Sync', () => {
    it('should have data in postgres medic table', async () => {
      const couchdbTableResult = await client.query(`SELECT * FROM ${PGTABLE}`);
      expect(couchdbTableResult.rows.length).to.equal(docs.length);
    });

    it('should have data in postgres contacts table', async () => {
      const contactsTableResult = await client.query(`SELECT * FROM ${POSTGRES_SCHEMA}.contacts`);
      expect(contactsTableResult.rows.length).to.equal(contacts().length);
    });

    it('should have data in postgres reports table', async () => {
      const reportsTableResult = await client.query(`SELECT * FROM ${POSTGRES_SCHEMA}.reports`);
      expect(reportsTableResult.rows.length).to.equal(reports().length);
    });

    it('should have data in postgres persons table', async () => {
      const personsTableResult = await client.query(`SELECT * FROM ${POSTGRES_SCHEMA}.persons`);
      expect(personsTableResult.rows.length).to.equal(persons().length);
    });

    it('should have the expected data in a record in contact table', async () => {
      const contact = contacts().at(0);
      const contactTableResult = await client.query(
        `SELECT * FROM ${POSTGRES_SCHEMA}.contacts where uuid=$1`,
        [contact._id]
      );
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
      const personTableResult = await client.query(
        `SELECT * FROM ${POSTGRES_SCHEMA}.persons where uuid=$1`,
        [person._id]
      );
      expect(personTableResult.rows.length).to.equal(1);
      expect(personTableResult.rows[0].date_of_birth).to.equal(person.date_of_birth);
      expect(personTableResult.rows[0].sex).to.equal(person.sex);
    });

    it('should have the expected data in a record in reports table', async () => {
      const report = reports().at(0);
      const reportTableResult = await client.query(
        `SELECT * FROM ${POSTGRES_SCHEMA}.reports where uuid=$1`,
        [report._id]
      );
      expect(reportTableResult.rows.length).to.equal(1);
      expect(reportTableResult.rows[0].doc).excluding(['_rev', '_id']).to.deep.equal(report);
      expect(reportTableResult.rows[0].form).to.equal(report.form);
      expect(reportTableResult.rows[0].patient_id).to.equal(report.patient_id);
      expect(reportTableResult.rows[0].contact_id).to.equal(report.contact._id);
      expect(reportTableResult.rows[0].fields).to.deep.equal(report.fields);
    });
  });

  describe('Incremental sync', () => {
    it('should process document edits', async () => {
      const report = reports()[0];
      const contact = contacts()[0];

      expect(contact.type).to.equal('person');

      await editDoc({ ...report, edited: 1 });
      await editDoc({ ...contact, edited: 1 });

      await delay(24); // wait for CHT-Sync

      const pgTableDataRecord = await client.query(`SELECT * from ${PGTABLE} where _id = $1`, [report._id]);
      expect(pgTableDataRecord.rows[0].doc.edited).to.equal(1);

      const pgTableContact = await client.query(`SELECT * from ${PGTABLE} where _id = $1`, [contact._id]);
      expect(pgTableContact.rows[0].doc.edited).to.equal(1);

      const conditionMet = await waitForCondition(async () => {
        const modelReportResult = await client.query(
          `SELECT * FROM ${POSTGRES_SCHEMA}.reports where uuid = $1`,
          [report._id]
        );
        return modelReportResult.rows[0]?.doc?.edited === 1;
      });
      expect(conditionMet).to.be.true;

      const modelContactResult = await client.query(
        `SELECT * FROM ${POSTGRES_SCHEMA}.contacts where uuid= $1`,
        [contact._id]
      );
      expect(modelContactResult.rows[0].edited).to.equal('1');

      const personConditionMet = await waitForCondition(async () => {
        const modelPersonResult = await client.query(
          `SELECT * FROM ${POSTGRES_SCHEMA}.persons WHERE uuid = $1`,
          [contact._id]
        );
        return modelPersonResult.rows[0]?.edited === '1';
      });
      expect(personConditionMet).to.be.true;

      const contactsTableResult = await client.query(`SELECT * FROM ${POSTGRES_SCHEMA}.contacts`);
      expect(contactsTableResult.rows.length).to.equal(contacts().length);

      const reportsTableResult = await client.query(`SELECT * FROM ${POSTGRES_SCHEMA}.reports`);
      expect(reportsTableResult.rows.length).to.equal(reports().length);
    });

    it('should process contact deletes', async () => {
      const contact = contacts()[0];
      await deleteDoc(contact);
      await delay(6); // wait for CHT-Sync
      const pgTableContact = await client.query(`SELECT * from ${PGTABLE} where _id = $1`, [contact._id]);
      expect(pgTableContact.rows[0]._deleted).to.equal(true);
      const conditionMet = await waitForCondition(async () => {
        const modelContactResult = await client.query(
          `SELECT * FROM ${POSTGRES_SCHEMA}.contacts where uuid= $1`,
          [contact._id]
        );
        return modelContactResult.rows.length === 0;
      });
      expect(conditionMet).to.be.true;
    });

    it('should process person deletes', async () => {
      const person = persons().find(person => !person._deleted);

      const preDelete = await client.query(`SELECT * FROM ${POSTGRES_SCHEMA}.persons where uuid = $1`, [person._id]);
      expect(preDelete.rows.length).to.equal(1);

      await deleteDoc(person);
      await delay(6); // wait for CHT-Sync

      const conditionMet = await waitForCondition(async () => {
        const modelContactResult = await client.query(
          `SELECT * FROM ${POSTGRES_SCHEMA}.contacts where uuid = $1`,
          [person._id]
        );
        return modelContactResult.rows.length === 0;
      });

      expect(conditionMet).to.be.true;

      const postDelete = await client.query(`SELECT * FROM ${POSTGRES_SCHEMA}.persons where uuid = $1`, [person._id]);
      expect(postDelete.rows.length).to.equal(0);
    });

    it('should process report deletes', async () => {
      const report = reports()[0];
      await deleteDoc(report);
      await delay(6); // wait for CHT-Sync
      const pgTableReport = await client.query(`SELECT * from ${PGTABLE} where _id = $1`, [report._id]);
      expect(pgTableReport.rows[0]._deleted).to.equal(true);

      const conditionMet = await waitForCondition(async () => {
        const modelReportResult = await client.query(
          `SELECT * FROM ${POSTGRES_SCHEMA}.reports where uuid = $1`,
          [report._id]
        );
        return modelReportResult.rows.length === 0;
      });
      expect(conditionMet).to.be.true;
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

      const pgTableNewDoc = await client.query(`SELECT * from ${PGTABLE} where _id = $1`, [newDoc._id]);
      expect(pgTableNewDoc.rows.length).to.equal(1);

      const conditionMet = await waitForCondition(async () => {
        const modelNewDocResult = await client.query(
          `SELECT * FROM ${POSTGRES_SCHEMA}.contacts where uuid = $1`,
          [newDoc._id]
        );
        return modelNewDocResult.rows.length === 1 && modelNewDocResult.rows[0].name === newDoc.name;
      });
      expect(conditionMet).to.be.true;
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

      await delay(15); // wait for DBT

      const modelContactResult = await client.query(
        `SELECT * FROM ${POSTGRES_SCHEMA}.contacts where uuid= $1`,
        [contact._id]
      );
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

      const modelContactResult = await client.query(
        `SELECT * FROM ${POSTGRES_SCHEMA}.contacts where uuid= $1`,
        [contact._id]
      );
      expect(modelContactResult.rows.length).to.equal(1);
    });
  });

  describe('DBT Selector Tests', () => {
    it('should maintain separate manifests for different selectors', async () => {
      // Test contacts selector
      await delay(6);

      const contactsManifest = await client.query(
        `SELECT manifest, dbt_selector FROM ${POSTGRES_SCHEMA}._dataemon WHERE dbt_selector = $1`,
        ['tag:contacts']
      );
      expect(contactsManifest.rows.length).to.be.greaterThan(0);
      expect(contactsManifest.rows[0].dbt_selector).to.equal('tag:contacts');

      // Test reports selector
      await delay(6);

      const reportsManifest = await client.query(
        `SELECT manifest, dbt_selector FROM ${POSTGRES_SCHEMA}._dataemon WHERE dbt_selector = $1`,
        ['tag:reports']
      );
      expect(reportsManifest.rows.length).to.be.greaterThan(0);
      expect(reportsManifest.rows[0].dbt_selector).to.equal('tag:reports');

      // Verify manifests are different
      expect(contactsManifest.rows[0].manifest).to.not.deep.equal(reportsManifest.rows[0].manifest);
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
      const couchdbTableResult = await client.query(`SELECT * FROM ${PGTABLE} where _deleted != true`);

      expect(couchdbTableResult.rows.length).to.equal(docs.length);
      const contactsTableResult = await client.query(`SELECT * FROM ${POSTGRES_SCHEMA}.contacts`);
      expect(contactsTableResult.rows.length).to.equal(contacts().length);
      const reportsTableResult = await client.query(`SELECT * FROM ${POSTGRES_SCHEMA}.reports`);
      expect(reportsTableResult.rows.length).to.equal(reports().length);
      const personsTableResult = await client.query(`SELECT * FROM ${POSTGRES_SCHEMA}.persons`);
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
      client = await rootConnect();
      const conditionMet = await waitForCondition(async () => {
        const modelNewDocResult = await client.query(
          `SELECT * FROM ${POSTGRES_SCHEMA}.contacts WHERE uuid = $1`,
          [newDoc._id]
        );
        return (
          modelNewDocResult.rows.length === 1 &&
          modelNewDocResult.rows[0].name === newDoc.name
        );
      });
      expect(conditionMet).to.be.true;
    });
  });
});
