import '../common.js';
import sinon from 'sinon';
import esmock from 'esmock';

let setup;
let db;
let pgClient;

describe('setup', () => {
  beforeEach(async () => {
    pgClient = {
      query: sinon.stub(),
      end: sinon.stub(),
    };

    db = {
      getPgClient: sinon.stub().returns(pgClient),
      postgresSchema: 'v1',
      postgresProgressTable: 'v1.couchdb_progress',
      postgresTable: 'v1.whatever',
    };

    setup = await esmock('../../src/setup', { '../../src/db': db });
  });
  
  afterEach(() => {
    sinon.restore();
  });

  describe('createDatabase', () => {
    it('should create schema, data table and seq table', async () => {
      await setup.createDatabase();

      expect(db.getPgClient.calledOnce).to.equal(true);
      expect(pgClient.query.calledThrice).to.equal(true);
      expect(pgClient.end.calledOnce).to.equal(true);
      expect(pgClient.query.args[0]).to.deep.equal(['CREATE SCHEMA IF NOT EXISTS v1']);
      expect(pgClient.query.args[1]).to.deep.equal([ `
CREATE TABLE IF NOT EXISTS v1.whatever (
  "@timestamp" TIMESTAMP,
  _id varchar,
  _rev int,
  doc jsonb,
  UNIQUE (_id, _rev)
)`]);
      expect(pgClient.query.args[2]).to.deep.equal([`
CREATE TABLE IF NOT EXISTS v1.couchdb_progress (
  seq varchar, 
  source varchar not null,
  UNIQUE (source)
);`]);
    }); 
  });
});
