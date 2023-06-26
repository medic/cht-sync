import path from "path";

export const LOGSTASH_PIPELINE_DIR = path.join(
  __dirname,
  "../logstash/pipeline"
);

export const COMMANDS: Record<string, any> = {
  local: "true",
};

export const ENV_COMMANDS: Record<string, any> = {
  local: "",
};
