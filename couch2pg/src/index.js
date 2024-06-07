import * as setup from './setup.js';
import * as db from './db.js';
import importer from './importer.js';

(async() => {
  await setup.createDatabase();

  await importer(db.getCouchDbClient());
})();
