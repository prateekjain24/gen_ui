#!/usr/bin/env bun

import { watch } from "node:fs";
import { access, mkdir, open } from "node:fs/promises";
import path from "node:path";

const LOG_DIRECTORY = path.join(process.cwd(), "data");
const LOG_FILE_PATH = path.join(LOG_DIRECTORY, "plan-edits.jsonl");

async function ensureLogFile(): Promise<void> {
  await mkdir(LOG_DIRECTORY, { recursive: true });
  try {
    await access(LOG_FILE_PATH);
  } catch {
    const handle = await open(LOG_FILE_PATH, "w");
    await handle.close();
  }
}

async function printNewEntries(offset: number): Promise<number> {
  const handle = await open(LOG_FILE_PATH, "r");

  try {
    const stats = await handle.stat();
    const startingPoint = stats.size < offset ? 0 : offset;

    if (stats.size <= startingPoint) {
      return stats.size;
    }

    const length = stats.size - startingPoint;
    const buffer = Buffer.alloc(length);
    await handle.read(buffer, 0, length, startingPoint);

    const chunk = buffer.toString("utf8");
    const lines = chunk.split("\n").filter(Boolean);

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line) as Record<string, unknown>;
        process.stdout.write(`${JSON.stringify(parsed, null, 2)}\n\n`);
      } catch (error) {
        process.stdout.write(`[warn] Skipping malformed entry: ${String(error)}\n`);
      }
    }

    return stats.size;
  } finally {
    await handle.close();
  }
}

async function main() {
  await ensureLogFile();
  let offset = await printNewEntries(0);

  process.stdout.write(`Watching ${LOG_FILE_PATH} for plan edit telemetry...\n`);

  const watcher = watch(LOG_FILE_PATH, { persistent: true }, eventType => {
    if (eventType !== "change") {
      return;
    }

    void (async () => {
      offset = await printNewEntries(offset);
    })();
  });

  watcher.on("error", error => {
    process.stderr.write(`Watcher error: ${String(error)}\n`);
  });

  const shutdown = () => {
    watcher.close();
    process.stdout.write("\nStopped tailing plan edit telemetry.\n");
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

void main();
