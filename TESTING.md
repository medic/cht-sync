# Testing 
End-to-end tests for CHT-Sync can be found under `tests/`. In order to run these end-to-end tests locally, follow the steps below:

1. Create an `.env` file with the placeholder values from `env.template`.

2. Install the dependencies via:

```sh
npm install
```

3. Run the Docker containers locally:
```sh
# starts: logstash, postgres, postgrest, data-generator, couchdb and dbt
docker-compose -f docker-compose.couchdb.yml -f docker-compose.postgres.yml -f docker-compose.yml up -d
```

3. Wait for every container to be up and running.
4. Run the end-to-end tests:

```sh
# runs tests/e2e-test.spec.ts
npm test
```