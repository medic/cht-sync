const setup = require('./setup');
const importer = require('./importer');
const db = require('./db');

(async() => {
  try {
    await setup.createDatabase();
    await importer.import(db.couchDb);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
