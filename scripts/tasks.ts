import path from "node:path";
import fs from "node:fs/promises";
import util from "node:util";
import { existsSync } from "node:fs";
import cp from "node:child_process";
import {
  COMMANDS,
  ENV_COMMANDS,
  COMMAND_WORKING_DIRECTORY,
} from "./config";
import decompress from "decompress";

const execAsync = util.promisify(cp.exec);

export async function handleStartup(env: string) {
  const isLocal = env === "local";
  const envCommand = ENV_COMMANDS[env];

  if (!envCommand) {
    throw new Error("Invalid environment: can't find command for " + env);
  }

  const opts = { cwd: COMMAND_WORKING_DIRECTORY };

  const { stdout, stderr } = await Promise.resolve()
    .then(() => execAsync(COMMANDS["down"], opts))
    .then(() => execAsync(COMMANDS["build"], opts))
    .then(() => execAsync(envCommand, opts))
    .catch((err) => ({ stderr: err, stdout: undefined }));

  return stdout || stderr
}
