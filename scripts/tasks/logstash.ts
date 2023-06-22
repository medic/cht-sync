import path from "node:path";
import fs from "fs/promises"


function buildDockerfile() {
  return ""
}

function buildEntrypointFile() {
  return ""
}

function buildLogstashConf(db: string) {
  return ""
}

export async function buildLogstashConfig(opts: any) {
  let content: string;
  const { databases, outDir } = opts;

  const logstashDir = path.join(outDir, "logstash");
  const pipelineDir = path.join(logstashDir, "pipeline");

  const dockerfilePath = path.join(outDir, "Dockerfile");
  content = buildDockerfile()
  await fs.writeFile(dockerfilePath, content)

  const entrypointFile = path.join(outDir, "entrypoint.sh");
  content = buildEntrypointFile();
  await fs.writeFile(entrypointFile, content);

  for (const db of databases) {
    const fileDir = path.join(pipelineDir, db + ".conf")
    content = buildLogstashConf(db);
    fs.writeFile(fileDir, content)
  }
}
