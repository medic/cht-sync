import '../common.js';
import sinon from 'sinon';
import esmock from 'esmock';

let db;
let pg;
let pgClient;
let pouchDb;
let pouchDbClient;

describe('db', () => {
  beforeEach(async () => {
    pgClient = {
      connect: sinon.stub(),
      end: sinon.stub(),
    };
    pg = {
      Client: sinon.stub().returns(pgClient),
    };
    pouchDbClient = {};
    pouchDb = sinon.stub().returns(pouchDbClient);
    pouchDb.plugin = sinon.stub();

    process.env = {
      COUCHDB_SECURE: 'true',
      COUCHDB_USER: 'admin',
      COUCHDB_PASSWORD: 'password',
      COUCHDB_HOST: 'localhost',
      COUCHDB_PORT: '5984',
      COUCHDB_DBS: 'medicdb',
      POSTGRES_USER: 'postgres',
      POSTGRES_PASSWORD: 'pgpass',
      POSTGRES_HOST: 'pghost',
      POSTGRES_PORT: '1200',
      POSTGRES_DB: 'medicpg',
    };

    db = await esmock('../../src/db', {
      pg,
      'pouchdb-core': pouchDb,
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('getPgClient', () => {
    it('should create client and connect', async () => {
      const client = await db.getPgClient();
      expect(client).to.equal(pgClient);
      expect(client.connect.calledOnce).to.equal(true);
      expect(pg.Client.calledOnce).to.equal(true);
      expect(pg.Client.args[0]).to.deep.equal([{
        user: 'postgres',
        password: 'pgpass',
        host: 'pghost',
        port: '1200',
        database: 'medicpg',
      }]);
    });

    it('should throw error on create client', async () => {
      pg.Client.throws(new Error('wrong'));

      await expect(db.getPgClient()).to.be.eventually.rejectedWith('wrong');
      expect(pgClient.connect.calledOnce).to.equal(false);
    });

    it('should throw error on connect', async () => {
      pgClient.connect.rejects(new Error('boom'));

      await expect(db.getPgClient()).to.be.eventually.rejectedWith('boom');
      expect(pgClient.connect.calledOnce).to.equal(true);
    });
  });

  describe('getCouchDbClient', () => {
    it('should return pouch instance with default database', () => {
      const client = db.getCouchDbClient();

      expect(client).to.equal(pouchDbClient);
      expect(pouchDb.plugin.calledTwice).to.equal(true);
      expect(pouchDb.calledOnce).to.equal(true);
      expect(pouchDb.args[0]).to.deep.equal([
        'https://admin:password@localhost:5984/medicdb',
        { skip_setup: true },
      ]);
    });

    it('should return pouch instance with custom database', () => {
      const client = db.getCouchDbClient('dbnameomg');

      expect(client).to.equal(pouchDbClient);
      expect(pouchDb.plugin.calledTwice).to.equal(true);
      expect(pouchDb.calledOnce).to.equal(true);
      expect(pouchDb.args[0]).to.deep.equal([
        'https://admin:password@localhost:5984/dbnameomg',
        { skip_setup: true },
      ]);
    });

    it('should work with insecure couchdb', async () => {
      process.env.COUCHDB_SECURE = 'false';
      db = await esmock('../../src/db', { pg, 'pouchdb-core': pouchDb });

      db.getCouchDbClient('notmedic');
      expect(pouchDb.args[0]).to.deep.equal([
        'http://admin:password@localhost:5984/notmedic',
        { skip_setup: true },
      ]);
    });
  });

  describe('handle multiple DBs', () => {
    it('should split by space or comma', async () => {
      process.env.COUCHDB_DBS = 'db1, db2  db3,db4';

      db = await esmock('../../src/db', { pg, 'pouchdb-core': pouchDb });
      const expectedDbs = ['db1', 'db2', 'db3', 'db4'];
      expect(db.couchDbs).to.deep.equal(expectedDbs);
    });
  });
});
