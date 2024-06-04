const setup = require('./setup');
const importer = require('./importer');
const db = require('./db');

(async() => {
  await setup.createDatabase();
  await (await importer.import(db.couchDb)).watch();
})();
