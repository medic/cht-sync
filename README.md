# CHT Sync

Bundling of LogStash CouchDB source and PostgREST to sync data from CouchDB to Postgres. This basically copies data from CouchDB and puts it into Postgres in real-time.

**WARNING!** The schema differs from couch2pg. See [`init-db.sh`](./init-db.sh). This schema is automatically created by docker-compose

## Deployment

1. Export env vars mapped in the linked [`docker-compose.yml`](./docker-compose.yml),

```
POSTGRES_USER=<User with write access to the schema below>
POSTGRES_PASSWORD=<user password>
POSTGRES_DB=<Name of new database>
POSTGRES_TABLE=couchdb
POSTGRES_SCHEMA=v1

COUCHDB_USER=<read access user>
COUCHDB_PASSWORD=<password>
COUCHDB_DB=<main database with all records>
COUCHDB_HOST=<hostname for couchdb server>
```

3. `docker-compose up`
