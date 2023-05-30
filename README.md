# CHT Sync

CHT Sync is a bundling of Logstash CouchDB, and PostgREST to sync data from CouchDB to PostgreSQL for analytics to be displayed on a Superset dashboard. It copies data from CouchDB to PostgreSQL in realtime.

**WARNING!** The schema differs from couch2pg. See [`init-db.sh`](./postgres/init-db.sh). 


## Getting Started

CHT sync is designed to run locally in a development environment to test models or workflow or in production.

### Local Setup



### Production Setup


## Architecture




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
COUCHDB_PORT=<couchdb port>
CHT_PIPELINE_BRANCH_URL=<The CHT Pipeline  branch to use e.g. https://github.com/medic/cht-pipeline.git#first_release>
```

2. `docker-compose up`

## Superset dashboard intialisation
Run the following commands on a separte terminal while `docker-compose up` is still running

- Remember to change the variables as required
```
docker-compose exec -it superset superset fab create-admin \
              --username admin \
              --firstname Superset \
              --lastname Admin \
              --email admin@superset.com \
              --password admin
```

- `docker-compose exec -it superset superset db upgrade`

- `docker-compose exec -it superset superset init`