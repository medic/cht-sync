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

    pgClient.query.withArgs(`SELECT 1 FROM v1.whatever LIMIT 1;`).rejects({
      code: '42P01',
    });

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
      expect(pgClient.query.callCount).to.equal(6);
      expect(pgClient.end.calledOnce).to.equal(true);
      expect(pgClient.query.args[0]).to.deep.equal(['CREATE SCHEMA IF NOT EXISTS v1']);
      expect(pgClient.query.args[1]).to.deep.equal([`SELECT 1 FROM v1.whatever LIMIT 1;`]);
      expect(pgClient.query.args[2]).to.deep.equal([ `
CREATE TABLE IF NOT EXISTS v1.whatever (
  saved_timestamp TIMESTAMP,
  _id VARCHAR PRIMARY KEY,
  _deleted BOOLEAN,
  doc jsonb
)`]);
      expect(pgClient.query.args[3]).to.deep.equal([`
CREATE INDEX IF NOT EXISTS _deleted ON v1.whatever(_deleted);
`]);
      expect(pgClient.query.args[4]).to.deep.equal([`
CREATE INDEX IF NOT EXISTS saved_timestamp ON v1.whatever(saved_timestamp);
`]);
      expect(pgClient.query.args[5]).to.deep.equal([`
CREATE TABLE IF NOT EXISTS v1.couchdb_progress (
  seq varchar,
  pending integer,
  updated_at timestamptz,
  source varchar PRIMARY KEY
);`]);
    }); 
  });
});
