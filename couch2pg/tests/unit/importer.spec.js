import '../common.js';
import sinon from 'sinon';
import esmock from 'esmock';

let clock;
let couchDb;
let db;
let pgClient;
let importer;
let seqQueries;
let insertQuery;
let axios;

const getSeqMatch = () => `SELECT seq FROM ${db.postgresProgressTable} WHERE source = $1`;
const insertSeqMatch = () => `
  INSERT INTO ${db.postgresProgressTable}
    (seq, pending, source, updated_at)
  VALUES
    ($1, $2, $3, CURRENT_TIMESTAMP)
`;
const updateSeqMatch = () => `
  UPDATE ${db.postgresProgressTable}
    SET seq = $1, pending = $2, updated_at = CURRENT_TIMESTAMP
  WHERE source = $3
`;

const insertDocsMatch = () => `INSERT INTO ${db.postgresTable} (saved_timestamp, _id, _deleted, source, doc) VALUES`;

const ON_CONFLICT_STMT = `
ON CONFLICT (_id) DO UPDATE SET
  saved_timestamp = EXCLUDED.saved_timestamp,
  _deleted = EXCLUDED._deleted,
  source = EXCLUDED.source,
  doc = EXCLUDED.doc
`;

describe('importer', () => {
  beforeEach(async () => {
    clock = sinon.useFakeTimers();
    couchDb = {
      name: 'https://admin:pass@thehost:5984/medic',
      changes: sinon.stub(),
      allDocs: sinon.stub(),
    };

    pgClient = {
      query: sinon.stub(),
      end: sinon.stub(),
    };

    db = {
      getPgClient: sinon.stub().returns(pgClient),
      postgresProgressTable: 'v1.couchdb_progress',
      postgresTable: 'v1.whatever',
    };

    // axios is used to get pending count from couchdb
    // so stub any call to axios with response including pending count
    const pendingResponse = {
      status: 200,
      data: {
        pending: 0
      }
    };
    axios = {
      get: sinon.stub().resolves(pendingResponse)
    };

    seqQueries = {
      get: pgClient.query.withArgs(sinon.match(`SELECT seq FROM ${db.postgresProgressTable}`)),
      update: pgClient.query.withArgs(sinon.match(`UPDATE ${db.postgresProgressTable}`)),
      set: pgClient.query.withArgs(sinon.match(`INSERT INTO ${db.postgresProgressTable}`)),
    };
    insertQuery = pgClient.query.withArgs(sinon.match(`INSERT INTO ${db.postgresTable}`));

    importer = await esmock('../../src/importer', { '../../src/db': db, 'axios': axios });
  });
  
  afterEach(() => {
    clock.restore();
    sinon.restore();
  });

  it('should use database hostname and pathname as source', async () => {
    couchDb.changes.resolves({ results: [], last_seq: '21-vvv' });

    seqQueries.get.resolves({ rows: [{ seq: 1 }] });
    seqQueries.update.resolves();

    await importer(couchDb);

    expect(pgClient.query.calledTwice).to.equal(true);
    expect(pgClient.query.args[0]).to.deep.equal([getSeqMatch(), ['thehost/medic']]);
    expect(pgClient.query.args[1]).to.deep.equal([updateSeqMatch(), ['21-vvv', 0, 'thehost/medic']]);
  });
  
  it('should start with 0 seq if no checkpointer is found', async () => {
    couchDb.name = 'http://host/db';
    couchDb.changes.resolves({ results: [], last_seq: '73-1' });

    seqQueries.get.resolves({ rows: [] });
    seqQueries.set.resolves();
    seqQueries.update.resolves();

    await importer(couchDb);

    expect(couchDb.changes.args).to.deep.equal([[{ limit: 1000, seq_interval: 1000, since: 0, batch_size: 1000, include_docs: true }]]);
    expect(pgClient.query.calledThrice).to.equal(true);
    expect(pgClient.query.args[0]).to.deep.equal([getSeqMatch(), ['host/db']]);
    expect(pgClient.query.args[1]).to.deep.equal([insertSeqMatch(), [0, null, 'host/db']]);
    expect(pgClient.query.args[2]).to.deep.equal([updateSeqMatch(), ['73-1', 0, 'host/db']]);
  });
  
  it('should start with checkpointer seq when found', async () => {
    couchDb.changes.resolves({ results: [], last_seq: '21-vvv' });

    seqQueries.get.resolves({ rows: [{ seq: '22-123' }] });
    seqQueries.update.resolves();

    await importer(couchDb);

    expect(couchDb.changes.args).to.deep.equal([[{ limit: 1000, seq_interval: 1000, since: '22-123', batch_size: 1000, include_docs: true }]]);
  }); 

  it('should import one batch of documents', async () => {
    const now = new Date('2023-01-01');
    clock.setSystemTime(now.valueOf());
    const changes = [
      { id: 'doc1', doc: { _id: 'doc1', _rev: '23-1234', field: 'test1' } },
      { id: 'doc2', doc: { _id: 'doc2', _rev: '3-fdsfs', field: 'test2' } },
      { id: 'doc3', doc: { _id: 'doc3', _rev: '123-dsadadadssa', field: 'test3' } }
    ];
    couchDb.changes.onCall(0).resolves({ results: changes, last_seq: '23-ppp' });
    couchDb.changes.onCall(1).resolves({ results: [], last_seq: '25-vvv' });

    seqQueries.get
      .onCall(0).resolves({ rows: [{ seq: '1-22' }] })
      .onCall(1).resolves({ rows: [{ seq: '23-ppp' }] });
    seqQueries.update.resolves();
    pgClient.query.withArgs(sinon.match(insertDocsMatch())).resolves();

    await importer(couchDb);

    expect(couchDb.changes.calledTwice).to.equal(true);
    expect(couchDb.changes.args[0]).to.deep.equal([{ limit: 1000, seq_interval: 1000, since: '1-22', batch_size: 1000, include_docs: true }]);
    expect(couchDb.changes.args[1]).to.deep.equal([{ limit: 1000, seq_interval: 1000, since: '23-ppp', batch_size: 1000, include_docs: true }]);

    expect(seqQueries.update.calledTwice).to.equal(true);
    expect(seqQueries.update.args).to.deep.equal([
      [updateSeqMatch(), ['23-ppp', 0, 'thehost/medic']],
      [updateSeqMatch(), ['25-vvv', 0, 'thehost/medic']],
    ]);

    expect(couchDb.allDocs.called).to.equal(false);

    expect(pgClient.query.withArgs(sinon.match(insertDocsMatch())).args).to.deep.equal([[
      'INSERT INTO v1.whatever (saved_timestamp, _id, _deleted, source, doc) VALUES ' +
      '($1, $2, $3, $4, $5),($6, $7, $8, $9, $10),($11, $12, $13, $14, $15) ' + ON_CONFLICT_STMT,
      [
        now.toISOString(),
        'doc1',
        false,
        'thehost/medic',
        JSON.stringify(changes[0].doc),

        now.toISOString(),
        'doc2',
        false,
        'thehost/medic',
        JSON.stringify(changes[1].doc),

        now.toISOString(),
        'doc3',
        false,
        'thehost/medic',
        JSON.stringify(changes[2].doc),
      ]
    ]]);
    expect(db.getPgClient.callCount).to.equal(pgClient.end.callCount);
  });

  it('should import multiple batches of documents', async () => {
    const genChanges = (iteration, count) => {
      const changes = Array.from({ length: count }).map((_, i) => ({ 
        id: `doc${iteration}-${i}`, 
        doc: { _id: `doc${iteration}-${i}`, _rev: '1-rev', field: 2 } 
      }));

      return { changes };
    };

    const now = new Date('2023-01-01');
    clock.setSystemTime(now.valueOf());

    const iterationOne = genChanges(1, 3);
    const iterationTwo = genChanges(2, 3);
    const iterationThree = genChanges(3, 3);

    couchDb.changes.onCall(0).resolves({ results: iterationOne.changes, last_seq: '3-seq' });
    couchDb.changes.onCall(1).resolves({ results: iterationTwo.changes, last_seq: '6-seq' });
    couchDb.changes.onCall(2).resolves({ results: iterationThree.changes, last_seq: '9-seq' });
    couchDb.changes.onCall(3).resolves({ results: [], last_seq: '9-seq' });

    seqQueries.get
      .onCall(0).resolves({ rows: [{ seq: '1-seq' }] })
      .onCall(1).resolves({ rows: [{ seq: '3-seq' }] })
      .onCall(2).resolves({ rows: [{ seq: '6-seq' }] })
      .onCall(3).resolves({ rows: [{ seq: '9-seq' }] });
    seqQueries.update.resolves();
    pgClient.query.withArgs(sinon.match(insertDocsMatch())).resolves();

    await importer(couchDb);

    expect(couchDb.changes.callCount).to.equal(4);
    expect(couchDb.changes.args[0]).to.deep.equal([{ limit: 1000, seq_interval: 1000, since: '1-seq', batch_size: 1000, include_docs: true }]);
    expect(couchDb.changes.args[1]).to.deep.equal([{ limit: 1000, seq_interval: 1000, since: '3-seq', batch_size: 1000, include_docs: true }]);
    expect(couchDb.changes.args[2]).to.deep.equal([{ limit: 1000, seq_interval: 1000, since: '6-seq', batch_size: 1000, include_docs: true }]);
    expect(couchDb.changes.args[3]).to.deep.equal([{ limit: 1000, seq_interval: 1000, since: '9-seq', batch_size: 1000, include_docs: true }]);

    expect(seqQueries.update.callCount).to.equal(4);
    expect(seqQueries.update.args).to.deep.equal([
      [updateSeqMatch(), ['3-seq', 0, 'thehost/medic']],
      [updateSeqMatch(), ['6-seq', 0, 'thehost/medic']],
      [updateSeqMatch(), ['9-seq', 0, 'thehost/medic']],
      [updateSeqMatch(), ['9-seq', 0, 'thehost/medic']],
    ]);

    expect(couchDb.allDocs.called).to.equal(false);

    expect(pgClient.query.withArgs(sinon.match(insertDocsMatch())).callCount).to.equal(3);
    expect(pgClient.query.withArgs(sinon.match(insertDocsMatch())).args[0]).to.deep.equal([
      'INSERT INTO v1.whatever (saved_timestamp, _id, _deleted, source, doc) VALUES ' +
      '($1, $2, $3, $4, $5),($6, $7, $8, $9, $10),($11, $12, $13, $14, $15) ' + ON_CONFLICT_STMT,
      [
        now.toISOString(),
        iterationOne.changes[0].id,
        false,
        'thehost/medic',
        JSON.stringify(iterationOne.changes[0].doc),

        now.toISOString(),
        iterationOne.changes[1].id,
        false,
        'thehost/medic',
        JSON.stringify(iterationOne.changes[1].doc),

        now.toISOString(),
        iterationOne.changes[2].id,
        false,
        'thehost/medic',
        JSON.stringify(iterationOne.changes[2].doc),
      ]
    ]);

    expect(pgClient.query.withArgs(sinon.match(insertDocsMatch())).args[1]).to.deep.equal([
      'INSERT INTO v1.whatever (saved_timestamp, _id, _deleted, source, doc) VALUES ' +
      '($1, $2, $3, $4, $5),($6, $7, $8, $9, $10),($11, $12, $13, $14, $15) ' + ON_CONFLICT_STMT,
      [
        now.toISOString(),
        iterationTwo.changes[0].id,
        false,
        'thehost/medic',
        JSON.stringify(iterationTwo.changes[0].doc),

        now.toISOString(),
        iterationTwo.changes[1].id,
        false,
        'thehost/medic',
        JSON.stringify(iterationTwo.changes[1].doc),

        now.toISOString(),
        iterationTwo.changes[2].id,
        false,
        'thehost/medic',
        JSON.stringify(iterationTwo.changes[2].doc),
      ]
    ]);

    expect(pgClient.query.withArgs(sinon.match(insertDocsMatch())).args[2]).to.deep.equal([
      'INSERT INTO v1.whatever (saved_timestamp, _id, _deleted, source, doc) VALUES ' +
      '($1, $2, $3, $4, $5),($6, $7, $8, $9, $10),($11, $12, $13, $14, $15) ' + ON_CONFLICT_STMT,
      [
        now.toISOString(),
        iterationThree.changes[0].id,
        false,
        'thehost/medic',
        JSON.stringify(iterationThree.changes[0].doc),

        now.toISOString(),
        iterationThree.changes[1].id,
        false,
        'thehost/medic',
        JSON.stringify(iterationThree.changes[1].doc),

        now.toISOString(),
        iterationThree.changes[2].id,
        false,
        'thehost/medic',
        JSON.stringify(iterationThree.changes[2].doc),
      ]
    ]);
    expect(db.getPgClient.callCount).to.equal(pgClient.end.callCount);
  });
  
  it('should sanitize input', async () => {
    clock.setSystemTime();
    const brokenDoc = {
      _id: 'change',
      _rev: '1',
      field: '\u0000',
      otherField: 'something\u0000something\\u0000something',
    };
    couchDb.changes.onCall(0).resolves({ results: [{ id: 'change', doc: brokenDoc }], last_seq: '2' });
    couchDb.changes.onCall(1).resolves({ results: [], last_seq: '2' });

    seqQueries.get.resolves({ rows: [{ seq: '1-22' }] });

    await importer(couchDb);

    expect(couchDb.allDocs.called).to.equal(false);

    expect(pgClient.query.withArgs(sinon.match(insertDocsMatch())).args).to.deep.equal([[
      'INSERT INTO v1.whatever (saved_timestamp, _id, _deleted, source, doc) VALUES ' +
      '($1, $2, $3, $4, $5) ' + ON_CONFLICT_STMT,
      [
        new Date().toISOString(),
        'change',
        false,
        'thehost/medic',
        JSON.stringify({
          _id: 'change',
          _rev: '1',
          field: '',
          otherField: 'somethingsomethingsomething',
        }),
      ]
    ]]);
  });
  
  it('should remove security details from user docs', async () => {
    clock.setSystemTime();
    const userDoc = {
      _id: 'org.couchdb.user:paul',
      _rev: '1',
      type: 'user',
      password_scheme: '123',
      derived_key: '23',
      salt: 'a',
      name: 'paul',
      field: 2
    };
    couchDb.changes.onCall(0).resolves({ results: [{ id: 'org.couchdb.user:paul', doc: userDoc }], last_seq: '2' });
    couchDb.changes.onCall(1).resolves({ results: [], last_seq: '2' });

    seqQueries.get.resolves({ rows: [{ seq: '1-22' }] });

    await importer(couchDb);

    expect(couchDb.allDocs.called).to.equal(false);

    expect(pgClient.query.withArgs(sinon.match(insertDocsMatch())).args).to.deep.equal([[
      'INSERT INTO v1.whatever (saved_timestamp, _id, _deleted, source, doc) VALUES ' +
      '($1, $2, $3, $4, $5) ' + ON_CONFLICT_STMT,
      [
        new Date().toISOString(),
        'org.couchdb.user:paul',
        false,
        'thehost/medic',
        JSON.stringify({
          _id: 'org.couchdb.user:paul',
          _rev: '1',
          type: 'user',
          name: 'paul',
          field: 2
        }),
      ]
    ]]);
  });

  it('should insert deletes', async () => {
    const now = new Date('2024-01-01');
    clock.setSystemTime(now.valueOf());
    const changes = [
      { id: 'doc1', deleted: true, changes: [{ rev: 1 }] },
      { id: 'doc2', doc: { _id: 'doc2', _rev: '3-fdsfs', field: 'test2' } },
      { id: 'doc3', deleted: true }
    ];
    couchDb.changes.onCall(0).resolves({ results: changes, last_seq: '2' });
    couchDb.changes.onCall(1).resolves({ results: [], last_seq: '2' });

    seqQueries.get.resolves({ rows: [{ seq: '1-22' }] });

    await importer(couchDb);

    expect(couchDb.allDocs.called).to.equal(false);

    expect(pgClient.query.withArgs(sinon.match(insertDocsMatch())).args).to.deep.equal([[
      'INSERT INTO v1.whatever (saved_timestamp, _id, _deleted, source, doc) VALUES ' +
      '($1, $2, $3, $4, $5),($6, $7, $8, $9, $10),($11, $12, $13, $14, $15) ' + ON_CONFLICT_STMT,
      [
        now.toISOString(),
        'doc2',
        false,
        'thehost/medic',
        JSON.stringify(changes[1].doc),

        now.toISOString(),
        'doc1',
        true,
        'thehost/medic',
        JSON.stringify({ _id: 'doc1', _rev: 1, _deleted: true }),

        now.toISOString(),
        'doc3',
        true,
        'thehost/medic',
        JSON.stringify({ _id: 'doc3', _rev: undefined, _deleted: true }),
      ]
    ]]);
  });

  it('should save the correct pending count', async () => {
    const pendingResponse = {
      status: 200,
      data: {
        pending: 2134
      }
    };
    axios.get = sinon.stub().resolves(pendingResponse);

    couchDb.name = 'http://host/db';
    couchDb.changes.resolves({ results: [], last_seq: '73-1' });
    seqQueries.get.resolves({ rows: [] });
    seqQueries.set.resolves();
    seqQueries.update.resolves();

    await importer(couchDb);

    expect(pgClient.query.calledThrice).to.equal(true);
    expect(pgClient.query.args[0]).to.deep.equal([getSeqMatch(), ['host/db']]);
    expect(pgClient.query.args[1]).to.deep.equal([insertSeqMatch(), [0, null, 'host/db']]);
    expect(pgClient.query.args[2]).to.deep.equal([updateSeqMatch(), ['73-1', 2134, 'host/db']]);
  });

  it('should throw error when getting seq fails', async () => {
    seqQueries.get.rejects(new Error('omg'));

    await expect(importer(couchDb)).to.eventually.be.rejectedWith('omg');

    expect(couchDb.changes.called).to.equal(false);
    expect(couchDb.allDocs.called).to.equal(false);
    expect(seqQueries.update.called).to.equal(false);
    expect(seqQueries.get.called).to.equal(true);
    expect(insertQuery.called).to.equal(false);
  }); 
  
  it('should throw error when getting changes fails', async () => {
    seqQueries.get.resolves({ rows: [] });
    couchDb.changes.rejects(new Error('boom'));

    await expect(importer(couchDb)).to.eventually.be.rejectedWith('boom');

    expect(couchDb.changes.called).to.equal(true);
    expect(couchDb.allDocs.called).to.equal(false);
    expect(seqQueries.update.called).to.equal(false);
    expect(seqQueries.get.called).to.equal(true);
    expect(insertQuery.called).to.equal(false);
  }); 
  
  
  it('should throw error when saving docs fails', async () => {
    seqQueries.get.resolves({ rows: [] });
    couchDb.changes.resolves({ results: [{ id: 3, doc: { _id: 3, _rev: '3-fdsfs' } }], last_seq: '2' });
    insertQuery.rejects(new Error('out of space or something'));

    await expect(importer(couchDb)).to.eventually.be.rejectedWith('out of space or something');

    expect(couchDb.changes.called).to.equal(true);
    expect(couchDb.allDocs.called).to.equal(false);
    expect(seqQueries.update.called).to.equal(false);
    expect(seqQueries.get.called).to.equal(true);
    expect(insertQuery.called).to.equal(true);
  }); 
  
  it('should throw error when writing seq fails', async () => {
    seqQueries.get.resolves({ rows: [] });
    couchDb.changes.resolves({ results: [{ id: 3, doc: { _id: 3, _rev: '3-fdsfs' } }], last_seq: '2' });
    insertQuery.resolves();
    seqQueries.update.rejects(new Error('done'));

    await expect(importer(couchDb)).to.eventually.be.rejectedWith('done');

    expect(couchDb.changes.called).to.equal(true);
    expect(couchDb.allDocs.called).to.equal(false);
    expect(seqQueries.update.called).to.equal(true);
    expect(seqQueries.get.called).to.equal(true);
    expect(insertQuery.called).to.equal(true);
  });

  it('should not throw error when getting pending fails', async () => {
    const pendingResponse = {
      status: 504,
    };
    axios.get = sinon.stub().resolves(pendingResponse);

    seqQueries.get.resolves({ rows: [] });
    couchDb.changes.onCall(0).resolves({ results: [{ id: 'doc1', doc: { _id: 'doc1', _rev: '3-fdsfs' } }], last_seq: '23-ppp' });
    couchDb.changes.onCall(1).resolves({ results: [], last_seq: '25-vvv' });
    insertQuery.resolves();

    await importer(couchDb);

    expect(couchDb.changes.called).to.equal(true);
    expect(couchDb.allDocs.called).to.equal(false);
    expect(seqQueries.update.called).to.equal(true);
    expect(seqQueries.get.called).to.equal(true);
    expect(insertQuery.called).to.equal(true);
  });
  
  it('should retry on deadlock', async () => {
    const now = new Date('2023-01-01');
    clock.setSystemTime(now.valueOf());
    const changes = [
      { id: 'doc1', doc: { _id: 'doc1', field: 'test1' } },
      { id: 'doc2', doc: { _id: 'doc2', field: 'test2' } },
      { id: 'doc3', doc: { _id: 'doc3', field: 'test3' } }
    ];
    couchDb.changes.onCall(0).resolves({ results: changes, last_seq: '23-ppp' });
    couchDb.changes.onCall(1).resolves({ results: [], last_seq: '25-vvv' });

    seqQueries.get
      .onCall(0).resolves({ rows: [{ seq: '1-22' }] })
      .onCall(1).resolves({ rows: [{ seq: '23-ppp' }] });
    seqQueries.update.resolves();
    pgClient.query
      .withArgs(sinon.match(insertDocsMatch()))
      .onCall(0).rejects({ code: '40P01' })
      .onCall(1).resolves();

    await importer(couchDb);

    expect(couchDb.changes.calledTwice).to.equal(true);
    expect(couchDb.changes.args[0]).to.deep.equal([{ limit: 1000, seq_interval: 1000, since: '1-22', batch_size: 1000, include_docs: true }]);
    expect(couchDb.changes.args[1]).to.deep.equal([{ limit: 1000, seq_interval: 1000, since: '23-ppp', batch_size: 1000, include_docs: true }]);

    expect(seqQueries.update.calledTwice).to.equal(true);
    expect(seqQueries.update.args).to.deep.equal([
      [updateSeqMatch(), ['23-ppp', 0, 'thehost/medic']],
      [updateSeqMatch(), ['25-vvv', 0, 'thehost/medic']],
    ]);

    expect(couchDb.allDocs.called).to.equal(false);

    const queryArgs = [
      'INSERT INTO v1.whatever (saved_timestamp, _id, _deleted, source, doc) VALUES ' +
      '($1, $2, $3, $4, $5),($6, $7, $8, $9, $10),($11, $12, $13, $14, $15) ' + ON_CONFLICT_STMT,
      [
        now.toISOString(),
        'doc1',
        false,
        'thehost/medic',
        JSON.stringify(changes[0].doc),

        now.toISOString(),
        'doc2',
        false,
        'thehost/medic',
        JSON.stringify(changes[1].doc),

        now.toISOString(),
        'doc3',
        false,
        'thehost/medic',
        JSON.stringify(changes[2].doc),
      ]
    ];

    expect(db.getPgClient.callCount).to.equal(6);
    expect(pgClient.query.withArgs(sinon.match(insertDocsMatch())).args).to.deep.equal([queryArgs, queryArgs]);
    expect(db.getPgClient.callCount).to.equal(pgClient.end.callCount);
  }); 
});
