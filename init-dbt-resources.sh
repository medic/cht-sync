#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE USER IF NOT EXITST $DBT_POSTGRES_USER WITH PASSWORD '$DBT_POSTGRES_PASSWORD';
    CREATE SCHEMA IF NOT EXISTS $DBT_POSTGRES_SCHEMA AUTHORIZATION $DBT_POSTGRES_USER;

    GRANT USAGE ON SCHEMA $POSTGRES_SCHEMA TO $DBT_POSTGRES_USER;
    GRANT SELECT ON ALL TABLES IN SCHEMA $POSTGRES_SCHEMA TO $DBT_POSTGRES_USER;
    GRANT SELECT ON ALL SEQUENCES IN SCHEMA $POSTGRES_SCHEMA TO $DBT_POSTGRES_USER;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA $POSTGRES_SCHEMA TO $DBT_POSTGRES_USER;

    CREATE SCHEMA IF NOT EXISTS $DBT_POSTGRES_SCHEMA AUTHORIZATION $DBT_POSTGRES_USER;
EOSQL