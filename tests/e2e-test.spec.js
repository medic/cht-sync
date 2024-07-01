import { rootConnect } from './utils/postgres-utils.js';
import { importAllDocs, docs, reports, contacts, editDoc, deleteDoc } from './utils/couchdb-utils.js';
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

  it('should have data in postgres medic table', async () => {
    const couchdbTableResult = await client.query(`SELECT * FROM ${PGTABLE}`);
    expect(couchdbTableResult.rows.length).to.equal(docs.length);
  });

  it('should have data in postgres contacts table', async () => {
    const contactsTableResult = await client.query(`SELECT * FROM ${pgSchema}.contacts`);
    expect(contactsTableResult.rows.length).to.equal(contacts().length);
  });

  it('should have data in postgres data_record table', async () => {
    const reportsTableResult = await client.query(`SELECT * FROM ${pgSchema}.reports`);
    expect(reportsTableResult.rows.length).to.equal(reports().length);
  });

  it('should process document edits', async () => {
    const report = reports()[0];
    const contact = contacts()[0];
    await editDoc({ ...report, edited: 1 });
    await editDoc({ ...contact, edited: 1 });

    await delay(6); // wait for CHT-Sync

    const pgTableDataRecord = await client.query(`SELECT * from ${PGTABLE} where _id = $1`, [report._id]);
    expect(pgTableDataRecord.rows[0].doc.edited).to.equal(1);

    const pgTableContact = await client.query(`SELECT * from ${PGTABLE} where _id = $1`, [contact._id]);
    expect(pgTableContact.rows[0].doc.edited).to.equal(1);

    await delay(6); // wait for DBT
    await delay(6); // wait for DBT

    const modelReportResult = await client.query(`SELECT * FROM ${pgSchema}.reports where _id = $1`, [report._id]);
    expect(modelReportResult.rows[0].doc.edited).to.equal(1);

    const modelContactResult = await client.query(`SELECT * FROM ${pgSchema}.contacts where uuid = $1`, [contact._id]);
    expect(modelContactResult.rows[0].doc.edited).to.equal(1);

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
    const modelContactResult = await client.query(`SELECT * FROM ${pgSchema}.contacts where uuid = $1`, [contact._id]);
    expect(modelContactResult.rows.length).to.equal(0);
  });

  it('should process person deletes', async () => {
    const person = contacts().find(contact => contact.type === 'person' && !contact._deleted);

    const preDelete = await client.query(`SELECT * FROM ${pgSchema}.persons where uuid = $1`, [person._id]);
    expect(preDelete.rows.length).to.equal(1);

    await deleteDoc(person);
    await delay(6); // wait for CHT-Sync
    await delay(6); // wait for DBT
    await delay(6); // wait for DBT

    const modelContactResult = await client.query(`SELECT * FROM ${pgSchema}.contacts where uuid = $1`, [person._id]);
    expect(modelContactResult.rows.length).to.equal(0);

    const postDelete = await client.query(`SELECT * FROM ${pgSchema}.persons where uuid = $1`, [person._id]);
    expect(postDelete.rows.length).to.equal(0);
  });

  it('should process report deletes', async () => {
    const report = reports()[0];
    await deleteDoc(report);
    await delay(6); // wait for CHT-Sync
    const pgTableReport = await client.query(`SELECT * from ${PGTABLE} where _id = $1`, [report._id]);
    expect(pgTableReport.rows[0]._deleted).to.equal(true);
    await delay(6); // wait for DBT
    const modelReportResult = await client.query(`SELECT * FROM ${pgSchema}.reports where _id = $1`, [report._id]);
    expect(modelReportResult.rows.length).to.equal(0);
  });
});
