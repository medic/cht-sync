import { flow } from "lodash";
import { Command } from "commander";
import { version } from "../package.json";
import {
  buildGammaConfigs,
  buildLocalConfigs,
  buildProdConfigs,
  handleStartup,
} from "./tasks";
import { buildAndValidOptions } from "./utils";

const program = new Command();

program
  .name("cht-sync")
  .description("CLI a builds scripts and files required for cht-sync")
  .version(version);

program
  .command("prod")
  .description("creates setup script for gamma deployments")
  .argument("[path]", "output directory", ".")
  .option("-d, --databases [databases]", "couchdb databases to sync", "")
  .option(
    "-f --force [force]",
    "overwrites existing configuration directories",
    false
  )
  .action((str, options): any =>
    Promise.resolve()
      .then(() => buildAndValidOptions(str, options))
      .then((opts) => buildProdConfigs(opts))
      .then((start) => start && handleStartup())
      .catch((err) => console.error(err))
  );

program
  .command("gamma")
  .description("creates setup script for gamma deployments")
  .argument("[path]", "output directory", ".")
  .option("-d, --databases [databases]", "couchdb databases to sync", "")
  .option(
    "-f --force [force]",
    "overwrites existing configuration directories",
    false
  )
  .action(flow(buildAndValidOptions, buildGammaConfigs, handleStartup));

program
  .command("local")
  .description("creates setup script for gamma deployments")
  .argument("[path]", "output directory", "./")
  .option("-d, --databases [databases]", "couchdb databases to sync", "")
  .option(
    "-f --force [force]",
    "overwrites existing configuration directories",
    false
  )
  .action(flow(buildAndValidOptions, buildLocalConfigs, handleStartup));

program.parse();

// => one = two = six = ten
