import chai from 'chai';
import { v4 as uuidv4 } from 'uuid';
import chaiExclude from 'chai-exclude';
chai.use(chaiExclude);
chai.use(chaiExclude);
import { rootConnect } from './utils/postgres-utils.js';
import { importAllDocs, docs, reports, contacts, editDoc, deleteDoc } from './utils/couchdb-utils.js';
const {
  POSTGRES_SCHEMA,
  DBT_POSTGRES_SCHEMA: pgSchema,
  POSTGRES_TABLE,
} = process.env;

const PGTABLE = `${POSTGRES_SCHEMA}.${POSTGRES_TABLE}`;

const delay = (seconds) => new Promise(resolve => setTimeout(resolve, seconds * 1000));

const waitForDbt = async (pgClient, retry = 90) => {
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

  it('should have data in postgres reports table', async () => {
    const reportsTableResult = await client.query(`SELECT * FROM ${pgSchema}.reports`);
    expect(reportsTableResult.rows.length).to.equal(reports().length);
  });

  it('should have data in postgres persons table', async () => {
    const personsTableResult = await client.query(`SELECT * FROM ${pgSchema}.persons`);
    expect(personsTableResult.rows.length).to.equal(contacts().filter(contact => contact.type === 'person').length);
  });

  it('should have the expected data in a record in postgres contact table', async () => {
    let contact = contacts().at(0);
    const contactTableResult = await client.query(`SELECT * FROM ${pgSchema}.contacts where uuid=$1`, [contact._id]);
    expect(contactTableResult.rows.length).to.equal(1);
    expect(contactTableResult.rows[0].parent_uuid).to.equal(contact.parent._id);
    expect(contactTableResult.rows[0].name).to.equal(contact.name);
    expect(contactTableResult.rows[0].contact_type).to.equal(contact.type);
    expect(contactTableResult.rows[0].phone).to.equal(contact.phone);
  });

  it('should have the expected data in a record in postgres person table', async () => {
    let person = contacts().filter(contact => contact.type === 'person').at(0);
    const personTableResult = await client.query(`SELECT * FROM ${pgSchema}.persons where uuid=$1`, [person._id]);
    expect(personTableResult.rows.length).to.equal(1);
    expect(personTableResult.rows[0].date_of_birth).to.equal(person.date_of_birth);
    expect(personTableResult.rows[0].sex).to.equal(person.sex);
  });

  it('should have the expected data in a record in postgres reports table', async () => {
    let report = reports().at(0);
    console.log("REPORT");
    console.log(JSON.stringify(report));
    const reportTableResult = await client.query(`SELECT * FROM ${pgSchema}.reports where uuid=$1`, [report._id]);
    console.log("REPORT_TABLE");
    console.log(JSON.stringify(reportTableResult.rows[0].doc));
    expect(reportTableResult.rows.length).to.equal(1);
    expect(reportTableResult.rows[0].doc).excluding(['_rev', '_id']).to.deep.equal(report);
    expect(reportTableResult.rows[0].form).to.equal(report.form);
    expect(reportTableResult.rows[0].patiend_id).to.equal(report.patiend_id);
    expect(reportTableResult.rows[0].contact_id).to.equal(report.contact._id);
    expect(reportTableResult.rows[0].fields).to.deep.equal(report.fields);
  });

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

    const modelContactResult = await client.query(`SELECT * FROM ${pgSchema}.contacts where uuid = $1`, [contact._id]);
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
    const modelContactResult = await client.query(`SELECT * FROM ${pgSchema}.contacts where uuid = $1`, [contact._id]);
    expect(modelContactResult.rows.length).to.equal(0);
  });

  it('should process person deletes', async () => {
    const person = contacts().find(contact => contact.type === 'person' && !contact._deleted);

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
    const pgTableReport = await client.query(`SELECT * from ${PGTABLE} where _id = $1`, [report._id]);
    expect(pgTableReport.rows[0]._deleted).to.equal(true);
    await delay(6); // wait for DBT
    const modelReportResult = await client.query(`SELECT * FROM ${pgSchema}.reports where uuid = $1`, [report._id]);
    expect(modelReportResult.rows.length).to.equal(0);
  });
});
