#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const [logPath, ...commandParts] = process.argv.slice(2);

if (!logPath || commandParts.length === 0) {
  console.error("Usage: node scripts/run-with-log.mjs <log-file> <command...>");
  process.exit(1);
}

const ensureParentDir = (filePath) => {
  const dir = dirname(filePath);
  if (dir && dir !== "." && !existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
};

ensureParentDir(logPath);

const logStream = createWriteStream(logPath, { flags: "a" });

const child = spawn(commandParts.join(" "), {
  shell: true,
  env: process.env,
  stdio: ["inherit", "pipe", "pipe"],
});

const forward = (target) => (chunk) => {
  target.write(chunk);
  logStream.write(chunk);
};

child.stdout?.on("data", forward(process.stdout));
child.stderr?.on("data", forward(process.stderr));

child.on("close", (code) => {
  const exitCode = typeof code === "number" ? code : 0;
  logStream.end(() => process.exit(exitCode));
});

child.on("error", (error) => {
  console.error(error);
  logStream.end(() => process.exit(1));
});

const shutdown = (signal) => () => {
  if (!child.killed) {
    child.kill(signal);
  }
};

process.on("SIGINT", shutdown("SIGINT"));
process.on("SIGTERM", shutdown("SIGTERM"));

process.on("exit", () => {
  logStream.end();
});
