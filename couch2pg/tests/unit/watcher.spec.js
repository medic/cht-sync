import '../common.js';
import sinon from 'sinon';
import esmock from 'esmock';

let clock;
let importer;
let db;
let watcher;

describe('watcher', () => {
  beforeEach(async () => {
    clock = sinon.useFakeTimers();

    db = { getCouchDbClient: sinon.stub() };
    importer = sinon.stub();

    watcher = await esmock('../../src/watcher', { '../../src/db': db, '../../src/importer': importer });
  });

  afterEach(() => {
    clock.restore();
    sinon.restore();
  });

  it('should watch proposed database', async () => {
    importer.onCall(0).resolves(2);
    importer.onCall(1).resolves(3);
    importer.onCall(2).resolves(0);

    watcher('this is the db name');

    expect(db.getCouchDbClient.calledOnceWith('this is the db name')).to.equal(true);
    expect(importer.calledOnce).to.equal(true);
    await Promise.resolve();
    expect(importer.calledTwice).to.equal(true);
    await Promise.resolve();
    expect(importer.calledThrice).to.equal(true);
  });

  it('should wait for 5 minutes after no results are processed', async () => {
    importer.onCall(0).resolves(2);
    importer.onCall(1).resolves(3);
    importer.onCall(2).resolves(0);
    importer.onCall(3).resolves(2);
    importer.onCall(4).resolves(0);

    watcher('medic-sentinel');

    expect(db.getCouchDbClient.calledOnceWith('medic-sentinel')).to.equal(true);
    expect(importer.calledOnce).to.equal(true);
    await Promise.resolve();
    expect(importer.calledTwice).to.equal(true);
    await Promise.resolve();
    expect(importer.calledThrice).to.equal(true);
    await Promise.resolve();
    expect(importer.calledThrice).to.equal(true);
    clock.tick(5 * 60 * 1000);
    await Promise.resolve();
    expect(importer.callCount).to.equal(4);
    await Promise.resolve();
    expect(importer.callCount).to.equal(5);
  });

  it('should stop on errors', async () => {
    importer.onCall(0).resolves(2);
    importer.onCall(1).resolves(3);
    importer.onCall(2).rejects(new Error('boom'));

    await expect(watcher('db')).to.eventually.be.rejectedWith('boom');
  });
});
