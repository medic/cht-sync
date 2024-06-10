import importer from './importer.js';
import * as db from './db.js';

const DELAY = 5 * 60 * 1000; // 5 minutes

export default async (dbName) => {
  const couchDb = db.getCouchDbClient(dbName);
  do {
    const processedChanges = await importer(couchDb);
    if (!processedChanges) {
      await new Promise(r => setTimeout(r, DELAY));
    }
  } while (true);
};
