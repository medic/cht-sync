import '../common.js';
import sinon from 'sinon';
import esmock from 'esmock'

let clock;
let couchDb;
let db;
let pgClient;
let importer;
let seqQueries;
let insertQuery;

const getSeqMatch = () => `SELECT seq FROM ${db.postgresProgressTable} WHERE source = $1`;
const insertSeqMatch = () => `INSERT INTO ${db.postgresProgressTable}(seq, source) VALUES ($1, $2)`;
const updateSeqMatch = () => `UPDATE ${db.postgresProgressTable} SET seq = $1 WHERE source = $2`;

const insertDocsMatch = () => `INSERT INTO ${db.postgresTable} ("@timestamp", _id, _rev, doc) VALUES`;

describe('importer', () => {
  beforeEach(async () => {
    clock = sinon.useFakeTimers();
    couchDb = {
      info: sinon.stub(),
      changes: sinon.stub(),
      allDocs: sinon.stub(),
    };

    pgClient = {
      query: sinon.stub(),
      end: sinon.stub(),
    };

    db = {
      getPgClient: sinon.stub().returns(pgClient),
      postgresProgressTable:'v1.couchdb_progress',
      postgresTable: 'v1.whatever',
    };

    seqQueries = {
      get: pgClient.query.withArgs(sinon.match(`SELECT seq FROM ${db.postgresProgressTable}`)),
      update: pgClient.query.withArgs(sinon.match(`UPDATE ${db.postgresProgressTable}`)),
      set:  pgClient.query.withArgs(sinon.match(`INSERT INTO ${db.postgresProgressTable}`)),
    };
    insertQuery = pgClient.query.withArgs(sinon.match(`INSERT INTO ${db.postgresTable}`));

    importer = await esmock('../../src/importer', { '../../src/db': db });
  });
  
  afterEach(() => {
    clock.restore();
    sinon.restore();
  });

  it('should use database name as source', async () => {
    couchDb.info.resolves({ db_name: 'thing' });
    couchDb.changes.resolves({ results: [], last_seq: '21-vvv' });

    seqQueries.get.resolves({ rows: [{ seq: 1 }] });
    seqQueries.update.resolves();

    await importer(couchDb);

    expect(couchDb.info.calledOnce).to.equal(true);
    expect(pgClient.query.calledTwice).to.equal(true);
    expect(pgClient.query.args[0]).to.deep.equal([getSeqMatch(), ['thing']]);
    expect(pgClient.query.args[1]).to.deep.equal([updateSeqMatch(), ['21-vvv', 'thing']]);
  });
  
  it('should start with 0 seq if no checkpointer is found', async () => {
    couchDb.info.resolves({ db_name: 'medic' });
    couchDb.changes.resolves({ results: [], last_seq: '73-1' });

    seqQueries.get.resolves({ rows: [] });
    seqQueries.set.resolves();
    seqQueries.update.resolves();

    await importer(couchDb);

    expect(couchDb.info.calledOnce).to.equal(true);
    expect(couchDb.changes.args).to.deep.equal([[{ limit: 1000, seq_interval: 1000, since: 0 }]]);
    expect(pgClient.query.calledThrice).to.equal(true);
    expect(pgClient.query.args[0]).to.deep.equal([getSeqMatch(), ['medic']]);
    expect(pgClient.query.args[1]).to.deep.equal([insertSeqMatch(), [0, 'medic']]);
    expect(pgClient.query.args[2]).to.deep.equal([updateSeqMatch(), ['73-1', 'medic']]);
  });
  
  it('should start with checkpointer seq when found', async () => {
    couchDb.info.resolves({ db_name: 'dbname' });
    couchDb.changes.resolves({ results: [], last_seq: '21-vvv' });

    seqQueries.get.resolves({ rows: [{ seq: '22-123' }] });
    seqQueries.update.resolves();

    await importer(couchDb);

    expect(couchDb.info.calledOnce).to.equal(true);
    expect(couchDb.changes.args).to.deep.equal([[{ limit: 1000, seq_interval: 1000, since: '22-123' }]]);
  }); 

  it('should import one batch of documents', async () => {
    const now = new Date('2023-01-01');
    clock.setSystemTime(now.valueOf());
    couchDb.info.resolves({ db_name: 'dbname' });
    const changes = [{ id: 'doc1' }, { id: 'doc2' }, { id: 'doc3' }];
    const docs = [
      { id: 'doc1', doc: { _id: 'doc1', _rev: '23-1234', field: 'test1' } },
      { id: 'doc2', doc: { _id: 'doc2', _rev: '3-fdsfs', field: 'test2' } },
      { id: 'doc3', doc: { _id: 'doc3', _rev: '123-dsadadadssa', field: 'test3' } }
    ];
    couchDb.changes.onCall(0).resolves({ results: changes, last_seq: '23-ppp' });
    couchDb.changes.onCall(1).resolves({ results: [], last_seq: '25-vvv' });
    couchDb.allDocs.resolves({ rows: docs });

    seqQueries.get
      .onCall(0).resolves({ rows: [{ seq: '1-22' }] })
      .onCall(1).resolves({ rows: [{ seq: '23-ppp' }] });
    seqQueries.update.resolves();
    pgClient.query.withArgs(sinon.match(insertDocsMatch())).resolves();

    await importer(couchDb);

    expect(couchDb.changes.calledTwice).to.equal(true);
    expect(couchDb.changes.args[0]).to.deep.equal([{ limit: 1000, seq_interval: 1000, since: '1-22' }]);
    expect(couchDb.changes.args[1]).to.deep.equal([{ limit: 1000, seq_interval: 1000, since: '23-ppp' }]);

    expect(seqQueries.update.calledTwice).to.equal(true);
    expect(seqQueries.update.args).to.deep.equal([
      [updateSeqMatch(), ['23-ppp', 'dbname']],
      [updateSeqMatch(), ['25-vvv', 'dbname']],
    ]);

    expect(couchDb.allDocs.calledOnce).to.equal(true);
    expect(couchDb.allDocs.args).to.deep.equal([[{ include_docs: true, keys: ['doc1', 'doc2', 'doc3'] }]]);

    expect(pgClient.query.withArgs(sinon.match(insertDocsMatch())).args).to.deep.equal([[
      'INSERT INTO v1.whatever ("@timestamp", _id, _rev, doc) VALUES ($1, $2, $3, $4),($5, $6, $7, $8),($9, $10, $11, $12) ON CONFLICT (_id, _rev) DO NOTHING',
      [
        now.toISOString(),
        'doc1',
        '23',
        JSON.stringify(docs[0].doc),

        now.toISOString(),
        'doc2',
        '3',
        JSON.stringify(docs[1].doc),

        now.toISOString(),
        'doc3',
        '123',
        JSON.stringify(docs[2].doc),
      ]
    ]]);
  });

  it('should import multiple batches of documents', async () => {

    const genChanges = (iteration, count) => {
      const changes = Array.from({ length: count }).map((_, i) => ({ id: `doc${iteration}-${i}` }));
      const docs = changes.map(change => ({ id: change.id, doc: { _id: change.id, _rev: '1-rev', field: Math.random() } }));

      return { changes, docs };
    };

    const now = new Date('2023-01-01');
    clock.setSystemTime(now.valueOf());
    couchDb.info.resolves({ db_name: 'dbname' });

    const iterationOne = genChanges(1, 3);
    const iterationTwo = genChanges(2, 3);
    const iterationThree = genChanges(3, 3);

    couchDb.changes.onCall(0).resolves({ results: iterationOne.changes, last_seq: '3-seq' });
    couchDb.changes.onCall(1).resolves({ results: iterationTwo.changes, last_seq: '6-seq' });
    couchDb.changes.onCall(2).resolves({ results: iterationThree.changes, last_seq: '9-seq' });
    couchDb.changes.onCall(3).resolves({ results: [], last_seq: '9-seq' });
    couchDb.allDocs.onCall(0).resolves({ rows: iterationOne.docs });
    couchDb.allDocs.onCall(1).resolves({ rows: iterationTwo.docs });
    couchDb.allDocs.onCall(2).resolves({ rows: iterationThree.docs });

    seqQueries.get
      .onCall(0).resolves({ rows: [{ seq: '1-seq' }] })
      .onCall(1).resolves({ rows: [{ seq: '3-seq' }] })
      .onCall(2).resolves({ rows: [{ seq: '6-seq' }] })
      .onCall(3).resolves({ rows: [{ seq: '9-seq' }] });
    seqQueries.update.resolves();
    pgClient.query.withArgs(sinon.match(insertDocsMatch())).resolves();

    await importer(couchDb);

    expect(couchDb.changes.callCount).to.equal(4);
    expect(couchDb.changes.args[0]).to.deep.equal([{ limit: 1000, seq_interval: 1000, since: '1-seq' }]);
    expect(couchDb.changes.args[1]).to.deep.equal([{ limit: 1000, seq_interval: 1000, since: '3-seq' }]);
    expect(couchDb.changes.args[2]).to.deep.equal([{ limit: 1000, seq_interval: 1000, since: '6-seq' }]);
    expect(couchDb.changes.args[3]).to.deep.equal([{ limit: 1000, seq_interval: 1000, since: '9-seq' }]);

    expect(seqQueries.update.callCount).to.equal(4);
    expect(seqQueries.update.args).to.deep.equal([
      [updateSeqMatch(), ['3-seq', 'dbname']],
      [updateSeqMatch(), ['6-seq', 'dbname']],
      [updateSeqMatch(), ['9-seq', 'dbname']],
      [updateSeqMatch(), ['9-seq', 'dbname']],
    ]);

    expect(couchDb.allDocs.callCount).to.equal(3);
    expect(couchDb.allDocs.args).to.deep.equal([
      [{ include_docs: true, keys: iterationOne.changes.map(c => c.id) }],
      [{ include_docs: true, keys: iterationTwo.changes.map(c => c.id) }],
      [{ include_docs: true, keys: iterationThree.changes.map(c => c.id) }],
    ]);

    expect(pgClient.query.withArgs(sinon.match(insertDocsMatch())).callCount).to.equal(3);
    expect(pgClient.query.withArgs(sinon.match(insertDocsMatch())).args[0]).to.deep.equal([
      'INSERT INTO v1.whatever ("@timestamp", _id, _rev, doc) VALUES ($1, $2, $3, $4),($5, $6, $7, $8),($9, $10, $11, $12) ON CONFLICT (_id, _rev) DO NOTHING',
      [
        now.toISOString(),
        iterationOne.docs[0].id,
        '1',
        JSON.stringify(iterationOne.docs[0].doc),

        now.toISOString(),
        iterationOne.docs[1].id,
        '1',
        JSON.stringify(iterationOne.docs[1].doc),

        now.toISOString(),
        iterationOne.docs[2].id,
        '1',
        JSON.stringify(iterationOne.docs[2].doc),
      ]
    ]);

    expect(pgClient.query.withArgs(sinon.match(insertDocsMatch())).args[1]).to.deep.equal([
      'INSERT INTO v1.whatever ("@timestamp", _id, _rev, doc) VALUES ($1, $2, $3, $4),($5, $6, $7, $8),($9, $10, $11, $12) ON CONFLICT (_id, _rev) DO NOTHING',
      [
        now.toISOString(),
        iterationTwo.docs[0].id,
        '1',
        JSON.stringify(iterationTwo.docs[0].doc),

        now.toISOString(),
        iterationTwo.docs[1].id,
        '1',
        JSON.stringify(iterationTwo.docs[1].doc),

        now.toISOString(),
        iterationTwo.docs[2].id,
        '1',
        JSON.stringify(iterationTwo.docs[2].doc),
      ]
    ]);

    expect(pgClient.query.withArgs(sinon.match(insertDocsMatch())).args[2]).to.deep.equal([
      'INSERT INTO v1.whatever ("@timestamp", _id, _rev, doc) VALUES ($1, $2, $3, $4),($5, $6, $7, $8),($9, $10, $11, $12) ON CONFLICT (_id, _rev) DO NOTHING',
      [
        now.toISOString(),
        iterationThree.docs[0].id,
        '1',
        JSON.stringify(iterationThree.docs[0].doc),

        now.toISOString(),
        iterationThree.docs[1].id,
        '1',
        JSON.stringify(iterationThree.docs[1].doc),

        now.toISOString(),
        iterationThree.docs[2].id,
        '1',
        JSON.stringify(iterationThree.docs[2].doc),
      ]
    ]);
  });
  
  it('should sanitize input', async () => {
    
  });
  
  it('should remove security details from user docs', async () => {
    
  });

  it('should not insert deletes', async () => {

  });

  it('should throw error when getting seq fails', async () => {
    
  }); 
  
  it('should throw error when getting changes fails', async () => {
    
  }); 
  
  it('should throw error when getting docs fails', async () => {
    
  }); 
  
  it('should throw error when saving docs fails', async () => {
    
  }); 
  
  it('should throw error when writing seq fails', async () => {
    
  }); 

  

  describe.skip('IO failure propagation:', function() {

    describe('of one batch', function() {
      const importerFailsBecause = function(reason) {
        return shouldFail(importer(db, couchdb).importBatch(), reason);
      };

      /* TODO each `it` expands on the previous' successful mocks with a failure that
              in the next is a success. Work out how to not have to repeat yourself
              in a clean way
      */
      describe('import correctly fails when', function() {
        it('accessing seq from postgres', function() {
          sinon.stub(db, 'one').rejects('seq');
          sinon.stub(db, 'query').rejects('seq');

          return importerFailsBecause('seq');
        });

        it('accessing changes from couchdb', function() {
          sinon.stub(db, 'one').resolves(STORED_SEQ);

          sinon.stub(couchdb, 'changes').rejects('changes');

          return importerFailsBecause('changes');
        });

        it('attempting to delete docs', function() {
          sinon.stub(db, 'one').resolves(STORED_SEQ);
          sinon.stub(couchdb, 'changes').resolves(CHANGES_FEED);

          sinon.stub(db, 'query').rejects('delete');

          return importerFailsBecause('delete');
        });

        it('accessing allDocs from couchdb', function() {
          sinon.stub(db, 'one').resolves(STORED_SEQ);
          sinon.stub(couchdb, 'changes').resolves(CHANGES_FEED);
          sinon.stub(db, 'query').resolves();
          
          sinon.stub(couchdb, 'allDocs').rejects('allDocs');

          return importerFailsBecause('allDocs');
        });

        it('trying to delete existing docs before adding them', function() {
          sinon.stub(db, 'one').resolves(STORED_SEQ);
          sinon.stub(couchdb, 'changes').resolves(CHANGES_FEED);
          const dbQuery = sinon.stub(db, 'query');
          dbQuery.onCall(0).resolves();
          sinon.stub(couchdb, 'allDocs').resolves(ALL_DOCS);

          dbQuery.onCall(1).rejects('Deleting stub to store');

          return importerFailsBecause('Deleting stub to store');
        });

        it('adding docs', function() {
          sinon.stub(db, 'one').resolves(STORED_SEQ);
          sinon.stub(couchdb, 'changes').resolves(CHANGES_FEED);
          const dbQuery = sinon.stub(db, 'query');
          dbQuery.onCall(0).resolves();
          sinon.stub(couchdb, 'allDocs').resolves(ALL_DOCS);
          dbQuery.onCall(1).resolves();

          dbQuery.withArgs(sinon.match(/INSERT INTO couchdb/)).rejects('insert docs');

          return importerFailsBecause('insert docs');
        });
      });
    });

    describe('of import all', function() {
      const importerFailsBecause = function(reason) {
        return shouldFail(importer(db, couchdb).importAll(), reason);
      };

      it('storing seq after a batch', function() {
        const importChangesBatch = sinon.stub();
        importChangesBatch.resolves({lastSeq: 2});
        importer.__set__('importChangesBatch', importChangesBatch);

        const dbQuery = sinon.stub(db, 'query');
        dbQuery.withArgs(sinon.match(/UPDATE couchdb_progress/)).rejects('update seq');

        return importerFailsBecause('update seq');
      });
    });

    describe('different scenarios for get sequence', function() {
      it('finds sequence for given source', function() {
        sinon.stub(db, 'one').resolves(STORED_SEQ);

        return importer(db, couchdb)._getSeq('localhost:5984/simon')
          .then(function(seq) {
            seq.should.equal(STORED_SEQ.seq);
          });
      });

      it('does not find sequence for given source but finds default source seq', function() {
        const seqStub = sinon.stub(db, 'one');
        seqStub.onCall(0).rejects({code: 'queryResultErrorCode.noData'});
        // default database sequence
        seqStub.onCall(1).resolves(STORED_SEQ);
        const updateDefaultSeq = sinon.stub(db, 'query').resolves({});

        return importer(db, couchdb)._getSeq('localhost:5984/simon')
          .then(function(seq) {
            seq.should.equal(STORED_SEQ.seq);
            updateDefaultSeq.callCount.should.equal(1);
            const stmt = 'UPDATE couchdb_progress SET source = \'localhost:5984/simon\' WHERE source = \'default-source\'';
            updateDefaultSeq.args[0][0].should.equal(stmt);
          });
      });

      it('does not find sequence for given nor default source', function() {
        const seqStub = sinon.stub(db, 'one');
        seqStub.onCall(0).rejects({code: 'queryResultErrorCode.noData'});
        seqStub.onCall(1).rejects({code: 'queryResultErrorCode.noData'});

        const insertSeq = sinon.stub(db, 'query').resolves({});

        return importer(db, couchdb)._getSeq('localhost:5984/simon')
          .then(function(seq) {
            seq.should.equal(0);
            insertSeq.callCount.should.equal(1);
            const stmt = 'INSERT INTO couchdb_progress(seq, source) VALUES (\'0\', \'localhost:5984/simon\')';
            insertSeq.args[0][0].should.equal(stmt);
          });
      });
    });
  });
});
