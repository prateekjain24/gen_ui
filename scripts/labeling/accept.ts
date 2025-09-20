#!/usr/bin/env bun

import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";

import { isLabelingReviewEnabled } from "@/lib/config/toggles";
import {
  formatSummary,
  mergeAcceptedLabels,
  readAcceptedLabels,
  toAcceptedDescriptor,
  writeAcceptedLabels,
} from "@/lib/labeling/accepted-store";
import type { LabelQueueItem } from "@/lib/labeling/types";

const DEFAULT_ENDPOINT = "http://localhost:3000/api/labeling";

interface QueueResponse {
  items: LabelQueueItem[];
  count: number;
  generatedAt: string;
}

interface CliOptions {
  endpoint: string;
  ids?: string[];
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { endpoint: DEFAULT_ENDPOINT };

  argv.forEach(arg => {
    if (arg.startsWith("--endpoint=")) {
      options.endpoint = arg.slice("--endpoint=".length).trim();
    } else if (arg.startsWith("--ids=")) {
      const raw = arg.slice("--ids=".length).trim();
      options.ids = raw ? raw.split(",").map(id => id.trim()).filter(Boolean) : [];
    }
  });

  return options;
}

async function fetchQueue(endpoint: string): Promise<LabelQueueItem[]> {
  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/json",
    },
  });

  if (response.status === 403) {
    throw new Error("Labeling review endpoint is disabled (HTTP 403). Set ENABLE_LABELING_REVIEW=true.");
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Queue fetch failed (${response.status}): ${text || response.statusText}`);
  }

  const payload = (await response.json()) as QueueResponse;
  return payload.items ?? [];
}

function selectByIds(items: LabelQueueItem[], ids: string[]): LabelQueueItem[] {
  if (!ids.length) {
    return [];
  }

  const byId = new Map(items.map(item => [item.id, item] as const));
  const selected: LabelQueueItem[] = [];
  const missing: string[] = [];

  ids.forEach(id => {
    const found = byId.get(id);
    if (found) {
      selected.push(found);
    } else {
      missing.push(id);
    }
  });

  if (missing.length) {
    console.warn(`Skipping unknown candidate id(s): ${missing.join(", ")}`);
  }

  return selected;
}

async function promptForSelection(items: LabelQueueItem[]): Promise<LabelQueueItem[]> {
  if (!items.length) {
    return [];
  }

  process.stdout.write("\nAvailable label candidates:\n\n");
  items.forEach((item, index) => {
    const nextValue = typeof item.nextValue === "string" ? item.nextValue : JSON.stringify(item.nextValue);
    process.stdout.write(
      `  [${index}] ${item.recipeId} • ${item.controlId} → ${nextValue}\n      notes: ${item.notes}\n      id: ${item.id}\n\n`
    );
  });

  const rl = createInterface({ input, output });
  const answer = await rl.question(
    "Enter comma-separated indexes to accept (press Enter to cancel): "
  );
  rl.close();

  const trimmed = answer.trim();
  if (!trimmed) {
    return [];
  }

  const selectedIndexes = trimmed
    .split(",")
    .map(part => Number.parseInt(part.trim(), 10))
    .filter(index => !Number.isNaN(index));

  const invalidIndexes = selectedIndexes.filter(index => index < 0 || index >= items.length);
  if (invalidIndexes.length) {
    console.warn(`Ignoring invalid index(es): ${invalidIndexes.join(", ")}`);
  }

  const validIndexes = selectedIndexes.filter(
    index => index >= 0 && index < items.length
  );

  return validIndexes.map(index => items[index]);
}

async function main() {
  if (!isLabelingReviewEnabled()) {
    console.error("Labeling review is disabled. Set ENABLE_LABELING_REVIEW=true before running this command.");
    process.exitCode = 1;
    return;
  }

  const options = parseArgs(process.argv.slice(2));
  let items: LabelQueueItem[] = [];

  try {
    items = await fetchQueue(options.endpoint);
  } catch (error) {
    console.error((error as Error).message);
    process.exitCode = 1;
    return;
  }

  if (!items.length) {
    process.stdout.write("Label queue is empty.\n");
    return;
  }

  let selected: LabelQueueItem[] = [];

  if (options.ids && options.ids.length) {
    selected = selectByIds(items, options.ids);
  } else {
    selected = await promptForSelection(items);
  }

  if (!selected.length) {
    process.stdout.write("No label candidates selected. Nothing to do.\n");
    return;
  }

  const existing = await readAcceptedLabels();
  const incoming = selected.map(toAcceptedDescriptor);
  const { merged, added } = mergeAcceptedLabels(existing, incoming);

  if (!added.length) {
    process.stdout.write("Selected candidates were already accepted. No changes written.\n");
    return;
  }

  try {
    await writeAcceptedLabels(merged);
  } catch (error) {
    console.error(`Failed to write accepted labels: ${(error as Error).message}`);
    process.exitCode = 1;
    return;
  }

  process.stdout.write(
    `Accepted ${added.length} label${added.length === 1 ? "" : "s"} and wrote to config/labeling/accepted.json.\n`
  );
  process.stdout.write(`\n${formatSummary(added)}\n`);
}

void main();
