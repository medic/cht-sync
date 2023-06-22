import path from "node:path";
import fs from "fs";

export const buildAndValidOptions = (
  rawPath: string,
  options: Record<string, any>
) => {
  const force = options.force;
  const databases = options.databases?.db
    .split(",")
    .filter((d: string) => d.length > 0);

  if (rawPath === "") {
    rawPath = "config";
  }

  const outDir = path.isAbsolute(rawPath) ? rawPath : path.resolve(rawPath);

  if (fs.existsSync(outDir)) {
    if (!force) {
      new Error("Output directory already exists on disc.");
    }

    fs.rmdirSync(outDir);
  }

  fs.mkdirSync(outDir);

  const opts = {
    outDir: outDir,
    databases: databases,
  };

  return opts;
};
