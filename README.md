# CHT Sync

CHT Sync is a bundled solution consisting of [Logstash](https://www.elastic.co/logstash/), [CouchDB](https://couchdb.apache.org/), [PostgREST](https://postgrest.org/en/stable/), and [DBT](https://www.getdbt.com/). Its purpose is to synchronize data from CouchDB to PostgreSQL, facilitating analytics on a dashboard. This synchronization occurs in real-time, ensuring that the data displayed on the dashboard is always up-to-date. CHT Sync copies data from CouchDB to PostgreSQL, enabling seamless integration and timely analytics.

**WARNING!** The schema differs from couch2pg. See [`./postgres/init-dbt-resources.sh`](./postgres/init-dbt-resources.sh).

**Note**: In order for `cht-sync` to run, it needs a link to [cht-pipeline](https://github.com/medic/cht-pipeline), which contains transformation models for DBT.

## Architecture

![Architecture Diagram](./architecture.png)

CHT Sync is an integrated solution designed to enable data synchronization between CouchDB and PostgreSQL for the purpose of analytics. It combines several technologies to achieve this seamless synchronization and provide an efficient workflow for data processing and visualization.

At the core of the CHT Sync are Logstash, PostgREST, and DBT. Logstash plays a key role in the data synchronization process, facilitating the extraction of data from CouchDB and transferring it to PostgREST, ensuring real-time updates in PostgreSQL. PostgREST, on the other hand, acts as a RESTful API layer, enabling convenient interactions with PostgreSQL for data storage and retrieval.

Once the data is synchronized and stored in PostgreSQL, it undergoes transformation using predefined DBT models from the [cht-pipeline](https://github.com/medic/cht-pipeline). DBT plays a crucial role in preparing the data in a format that is optimized for querying and analysis, ensuring the data is readily available for analytics purposes.

The overall architecture of CHT-sync is driven by the seamless integration of these technologies. CouchDB serves as the source database, containing the original data to be synchronized. Logstash, PostgREST, and DBT facilitate the data flow from CouchDB to PostgreSQL, transforming it into a queriable format. PostgreSQL acts as the centralized repository for the synchronized and transformed data.
We suggest using Superset for creating your dashboards, data visualization, or infographics.
## Getting Started

CHT Sync has been specifically designed to work in both local development environments for testing models or workflows, gamma environment, as well as in production environments. Each setup accommodates the needs of different stages or environments.

### Prerequisites

- `Docker`
- An `.env` file containing the environment variable placeholders from the `.env.template` file. The file should be located in the root directory of the project or set by the operating system. The variables should be customized accordingly for the specific deployment needs.

#### Environment variable
There are four environment variable groups in the `.env.template` file. To successfully set up `cht-sync`, It is important to understand the difference between them.
1. Postgresql and Postgres: Are used to establish the Postgres database to synchronize CouchDB data. They also define the schema and table names to store the CouchDB data. The main objective is to define the environment where the raw CouchDB data will be copied.
2. DBT: These environment variables are exclusive to the DBT configuration. The main objective is to define the environment where the tables and views for the models defined in `CHT_PIPELINE_BRANCH_URL` will be created. It is important to separate this environment from the previous group. `DBT_POSTGRES_USER` and `DBT_POSTGRES_SCHEMA` must be different from `POSTGRES_USER` and `POSTGRES_SCHEMA`. `DBT_POSTGRES_HOST` has to be the Postgres instance created with the environment variables set in the first group.
3. The following environment variables define the CouchDB instance we want to sync with. With `COUCHDB_DBS`, we can specify a list of databases to sync.

### Local Setup

The local environment setup involves starting Logstash, PostgreSQL, PostgREST, DBT, and CouchDB. This configuration facilitates data synchronization, transformation, and storage for local development and testing. Fake data is generated for CouchDB.

1. Provide the databases you want to sync in the `.env` file:

```
COUCHDB_DBS=<dbs-to-sync> # space separated list of databases you want to sync e.g "medic medic_sentinel"
```

2. Install the dependencies and run the Docker containers locally:

```sh
# starts: logstash, postgres, postgrest,  data-generator, couchdb and dbt
npm install
npm run local
```

#### Run end-to-end test locally
1. Update the following environment variables in your `.env` file:

```
# project wide: optional
COMPOSE_PROJECT_NAME=pipeline

# postgrest and pogresql: required environment variables for 'gamma', prod and 'local'
POSTGRES_USER=<your-postgres-user>
POSTGRES_PASSWORD=<your-postgres-password>
POSTGRES_DB=<your-database>
POSTGRES_TABLE=<your-postgres-table>
POSTGRES_SCHEMA=<your-base-postgres-schema>

# dbt: required environment variables for 'gamma', 'prod' and 'local'
DBT_POSTGRES_USER=<your-postgres-dbt-user>
DBT_POSTGRES_PASSWORD=<your-postgres-password>
DBT_POSTGRES_SCHEMA=<your-dbt-postgres-schema>
DBT_POSTGRES_HOST=<your-postgres-host> # IP address
CHT_PIPELINE_BRANCH_URL="https://github.com/medic/cht-pipeline.git#main"

# couchdb and logstash: required environment variables for 'gamma', 'prod' and 'local'
COUCHDB_USER=<your-couchdb-user>
COUCHDB_PASSWORD=<your-couchdb-password>
COUCHDB_DBS=<dbs-to-sync> # space separated list of databases you want to sync e.g "medic medic_sentinel"
COUCHDB_HOST=<your-couchdb-host>
COUCHDB_PORT=<your-couchdb-port>
COUCHDB_SECURE=false
```

If `CHT_PIPELINE_BRANCH_URL` is pointing to a private repo then you need to provide an access token in the url i.e. `https://<PAT>@github.com/medic/cht-pipeline.git#main`. In this example you will replace `<PAT>`  with an access token from Github. Instruction on how to generate one can be found [here](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens).

2. Install the dependencies and run the Docker containers locally:

```sh
# starts: logstash, postgres, postgrest,  data-generator, couchdb and dbt
npm install
npm run local
```

3. Wait for every container to be up and running.
4. Run the end-to-end tests:

```sh
# runs tests/e2e-test.spec.ts
npm test
```

### Gamma Setup

The gamma environment setup involves starting Logstash, PostgreSQL, PostgREST, and DBT. This configuration facilitates data synchronization, transformation, and storage for medic gamma hosting.

1. Update the following environment variables in your `.env` file:

```
# project wide: optional
COMPOSE_PROJECT_NAME=pipeline

COUCHDB_DBS=<dbs-to-sync> # space separated list of databases you want to sync e.g "medic medic_sentinel"

# couchdb and logstash: required environment variables for 'gamma', 'prod' and 'local'
COUCHDB_PASSWORD=<your-couchdb-password>
COUCHDB_SECURE=false
```

2. Install the dependencies and start the Docker containers:
```sh
# starts: logstash, postgres, postgrest, and dbt
npm install
npm run gamma
```

### Production Setup

The production environment setup involves starting Logstash, PostgREST, and DBT. This configuration facilitates data synchronization, transformation, and storage for CHT production hosting.

1. Update the following environment variables in your `.env` file:

```
# project wide: optional
COMPOSE_PROJECT_NAME=pipeline

COUCHDB_DBS=<dbs-to-sync> # space separated list of databases you want to sync e.g "medic medic_sentinel"

# postgrest and pogresql: required environment variables for 'gamma', prod and 'local'
POSTGRES_USER=<your-postgres-user>
POSTGRES_PASSWORD=<your-postgres-password>
POSTGRES_DB=<your-database>
POSTGRES_TABLE=<your-postgres-table>
POSTGRES_SCHEMA=<your-base-postgres-schema>

# dbt: required environment variables for 'gamma', 'prod' and 'local'
DBT_POSTGRES_USER=<your-postgres-dbt-user>
DBT_POSTGRES_PASSWORD=<your-postgres-password>
DBT_POSTGRES_SCHEMA=<your-dbt-postgres-schema>
DBT_POSTGRES_HOST=<your-postgres-host> # IP address

# couchdb and logstash: required environment variables for 'gamma', 'prod' and 'local'
COUCHDB_PASSWORD=<your-couchdb-password>
COUCHDB_HOST=<your-couchdb-host>
COUCHDB_PORT=<your-couchdb-port>
COUCHDB_SECURE=false
```

2. (Optional) Start local version of PostgreSQL:
```
docker-compose -f docker-compose.postgres.yml -f docker-compose.yml up postgres
```

3. Install the dependencies and start the Docker containers:
```sh
# starts: logstash, postgrest and dbt
npm install
npm run prod
```
