import path from "node:path";
import fs from "node:fs/promises";
import util from "node:util";
import { existsSync } from "node:fs";
import cp from "node:child_process";
import {
  COMMANDS,
  ENV_COMMANDS,
  LOGSTASH_PIPELINE_DIR,
  ZIP_INPUT_DIR,
  ZIP_OUTPUT_DIR,
} from "./config";
import decompress from "decompress";

const execAsync = util.promisify(cp.exec);

export async function prepareEnviroment(force: boolean) {
  if (existsSync(LOGSTASH_PIPELINE_DIR)) {
    if (!force) {
      new Error("Output directory already exists on disc.");
    }

    await fs.rm(LOGSTASH_PIPELINE_DIR, { recursive: true, force: true });
  }

  if (existsSync(ZIP_OUTPUT_DIR)) {
    if (!force) {
      new Error("Output directory already exists on disc.");
    }

    await fs.rm(LOGSTASH_PIPELINE_DIR, { recursive: true, force: true });
  }

  await fs.mkdir(LOGSTASH_PIPELINE_DIR);
}

export async function buildLogstashConfig(rawDbs: string) {
  const databases = rawDbs.split(" ").filter((d: string) => d.length > 0);

  for (const db of databases) {
    const fileDir = path.join(LOGSTASH_PIPELINE_DIR, db + ".conf");
    const content = buildLogstashContent(db);
    await fs.writeFile(fileDir, content);
  }
}

export async function handleStartup(env: string) {
  const isLocal = env === "local";
  const envCommand = ENV_COMMANDS[env];

  if (envCommand) {
    throw new Error("Invalid environment: can't find command for " + env);
  }

  const { stdout, stderr } = await Promise.resolve()
    .then(() => execAsync(COMMANDS["down"]))
    .then((): any => isLocal && decompress(ZIP_INPUT_DIR, ZIP_OUTPUT_DIR))
    .then(() => execAsync(COMMANDS["build"]))
    .then(() => execAsync(envCommand))
    .catch((err) => ({ stderr: err, stdout: undefined }));

  if (stderr) {
    throw new Error(stderr);
  }

  return stdout;
}

const buildLogstashContent = (db: string) => `
input {
    couchdb_changes {
        always_reconnect => true
        db => "${db}"
        host => "\${COUCHDB_HOST}"
        username => "\${COUCHDB_USER}"
        password => "\${COUCHDB_PASSWORD}"
        keep_id => true
        keep_revision => true
        secure => "\${COUCHDB_SECURE}"
        port => "\${COUCHDB_PORT}"
        sequence_path => "\${COUCHDB_SEQ}"
    }
}

filter {
    json{
        source => "message"
    }
    mutate {
       add_field => { "_id" => "%{[doc][_id]}" }
       add_field => { "_rev" => "%{[doc][_rev]}" }
    }
}

output {
    http {
        format => "json"
        http_method => "post"
        ignorable_codes => 409
        url => "http://\${HTTP_ENDPOINT}/${db}"
    }
}
`;
