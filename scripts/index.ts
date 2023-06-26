import { Command } from "commander";
import { version } from "../package.json";
import { handleStartup } from "./tasks";
import { prepareEnviroment } from "./tasks";
import { buildLogstashConfig } from "./tasks";

const program = new Command();

program
  .name("cht-sync")
  .description("Creates setup script for all environments v" + version)
  .option("-d, --databases", "couchdb databases to sync", "")
  .option("-e, --environment", "'local', 'prod', 'gamma'", "local")
  .option("-f --force", "overwrites existing configuration", false)
  .option("-s --start", "starts environment after building config", true)
  .action((_: string, opts: Record<string, any>): any =>
    Promise.resolve()
      .then(() => prepareEnviroment(opts.force))
      .then(() => buildLogstashConfig(opts.databases || process.env.COUCHDB_DB))
      .then(() => opts.start && handleStartup(opts.env))
      .catch((err) => console.error(err))
  );

program.parse();
