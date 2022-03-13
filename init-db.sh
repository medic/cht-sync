#!/bin/bash
set -e


for POSTGRES_TABLE in $POSTGRES_TABLES
do

echo Creating $POSTGRES_TABLE

export PGPASSWORD=$POSTGRES_PASSWORD

## DO NOT put any additional SQL here
#
#  Put all SQL into DBT. Bootstrapping should be the absolute minimum
#
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -h $POSTGRES_HOST <<-EOSQL
    CREATE SCHEMA IF NOT EXISTS $POSTGRES_SCHEMA AUTHORIZATION $POSTGRES_USER;
    CREATE TABLE IF NOT EXISTS $POSTGRES_SCHEMA.$POSTGRES_TABLE (
        "@version" TEXT,
        "@timestamp" TIMESTAMP,
        "_id" TEXT,
        "_rev" TEXT,
        doc jsonb,
        doc_as_upsert BOOLEAN,
        UNIQUE ("_id", "_rev")
    );
    CREATE INDEX IF NOT EXISTS _idx_$POSTGRES_TABLE ON $POSTGRES_SCHEMA.$POSTGRES_TABLE USING brin ("@timestamp")
EOSQL

done
