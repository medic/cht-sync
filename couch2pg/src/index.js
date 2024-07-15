import 'dotenv/config';

import * as setup from './setup.js';
import watcher from './watcher.js';
import * as db from './db.js';

(async() => {
  await setup.createDatabase();

  db.couchDbs.forEach(db => watcher(db));
})();
