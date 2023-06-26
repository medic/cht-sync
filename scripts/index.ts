import { Command } from "commander";
import { version } from "../package.json";
import { handleStartup } from "./tasks";
import { prepareEnviroment } from "./tasks";
import { buildLogstashConfig } from "./tasks";
import { COUCHDB_DBS } from "./config";

const program = new Command();

program
  .name("cht-sync")
  .description("CLI utility for generating and managing cht-sync toolkit");

program
  .command("init")
  .description("generates setup scripts for cht-sync tools")
  .option(
    "-d, --databases [databases]",
    "couchdb databases to sync with postgres",
    ""
  )
  .option(
    "-e, --environment [environment]",
    "build environments 'local', 'prod', 'gamma'",
    "local"
  )
  .option("-f, --force", "overwrites existing configurations", false)
  .option(
    "-s, --start",
    "starts environment after generating configurations",
    false
  )
  .action((opts): any =>
    Promise.resolve()
      .then(() => prepareEnviroment(opts.force))
      .then(() => buildLogstashConfig(opts.databases || COUCHDB_DBS))
      .then(() => opts.start && handleStartup(opts.environment))
      .then((output) => console.log(output || ""))
      .catch((err) => console.error(err))
      .then(() => process.exit(1))
  );

program.parse();
