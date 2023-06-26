import "dotenv/config"
import path from "path";

export const COUCHDB_DB = process.env.COUCHDB_DB;

export const LOGSTASH_PIPELINE_DIR = path.join(
  __dirname,
  "../logstash/pipeline"
);

export const ZIP_OUTPUT_DIR = path.join(__dirname, "../data/json_docs");
export const ZIP_INPUT_DIR = path.join(__dirname, "../data/json_docs.tar.gz");

export const COMMANDS: Record<string, any> = {
  build: "docker-compose build",
  down: "docker-compose -f docker-compose.couchdb.yml -f docker-compose.postgres.yml \
   -f docker-compose.yml down -v --remove-orphans",
};

export const ENV_COMMANDS: Record<string, any> = {
  gamma:
    "COUCHDB_HOST=adp-sandbox.dev.medicmobile.org COUCHDB_DB=medic COUCHDB_USER=medic \
     docker-compose up logstash postgres postgrest dbt",
  prod: "docker-compose up logstash postgrest dbt",
  local:
    "docker-compose -f docker-compose.couchdb.yml -f docker-compose.postgres.yml \
    -f docker-compose.yml up",
};
