import { buildLogstashConfig } from "./logstash";

type ActionHandler =  (options: Record<string, any>) => boolean;

export const buildProdConfigs: ActionHandler = (opts) => {
  buildLogstashConfig(opts);
  handleDbt(opts);
  handlePostgrest(opts);

  return opts.startup
};

export const buildGammaConfigs: ActionHandler = (opts) => {
  buildLogstashConfig(opts);
  handleDbt(opts);
  handlePostgrest(opts);
  handlePostgres(opts);

  return opts.startup
};

export const buildLocalConfigs: ActionHandler = (opts) => {
  buildLogstashConfig(opts);
  handleDbt(opts);
  handlePostgrest(opts);
  handleDataGenerator(opts);
  handleCouchdb(opts);

  return opts.startup
};

export const handleStartup = () => {}


function handleDbt(opts: any) {
  throw new Error("Function not implemented.");
}

function handlePostgrest(opts: any) {
  throw new Error("Function not implemented.");
}

function handlePostgres(opts: any) {
  throw new Error("Function not implemented.");
}

function handleDataGenerator(opts: any) {
  throw new Error("Function not implemented.");
}

function handleCouchdb(opts: any) {
  throw new Error("Function not implemented.");
}

