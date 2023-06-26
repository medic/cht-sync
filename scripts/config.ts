import "dotenv/config"
import path from "path";

export const COUCHDB_DBS = process.env.COUCHDB_DBS || "";

export const LOGSTASH_PIPELINE_DIR = path.join(
  __dirname,
  "../logstash/pipeline"
);

export const ZIP_OUTPUT_DIR = path.join(__dirname, "../data/");
export const ZIP_INPUT_DIR = path.join(__dirname, "../data/json_docs.tar.gz");
export const COMMAND_WORKING_DIRECTORY = path.join(__dirname, "../");

export const COMMANDS: Record<string, any> = {
  build: "docker-compose build",
  down: "docker-compose -f docker-compose.couchdb.yml -f docker-compose.postgres.yml \
   -f docker-compose.yml down -v --remove-orphans",
};

export const ENV_COMMANDS: Record<string, any> = {
  gamma:
    "COUCHDB_HOST=adp-sandbox.dev.medicmobile.org COUCHDB_DBS=medic COUCHDB_USER=medic \
     docker-compose up -d logstash postgres postgrest dbt",
  prod: "docker-compose up -d logstash postgrest dbt",
  local:
    "docker-compose -f docker-compose.couchdb.yml -f docker-compose.postgres.yml \
    -f docker-compose.yml up -d",
};
