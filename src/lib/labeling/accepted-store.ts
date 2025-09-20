import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { AcceptedLabelDescriptor, LabelQueueItem } from "@/lib/labeling/types";

const ACCEPTED_RELATIVE_PATH = path.join("config", "labeling", "accepted.json");

const FILE_ENCODING = "utf8";

export interface MergeResult {
  merged: AcceptedLabelDescriptor[];
  added: AcceptedLabelDescriptor[];
}

function resolvePath(filePath?: string): string {
  if (filePath) {
    return filePath;
  }
  return path.join(process.cwd(), ACCEPTED_RELATIVE_PATH);
}

export function getAcceptedLabelsPath(): string {
  return resolvePath();
}

export async function readAcceptedLabels(filePath?: string): Promise<AcceptedLabelDescriptor[]> {
  const acceptedPath = resolvePath(filePath);
  try {
    const content = await readFile(acceptedPath, FILE_ENCODING);
    const parsed = JSON.parse(content) as AcceptedLabelDescriptor[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export function toAcceptedDescriptor(candidate: LabelQueueItem): AcceptedLabelDescriptor {
  return {
    recipeId: candidate.recipeId,
    controlId: candidate.controlId,
    nextValue: candidate.nextValue,
    notes: candidate.notes,
  };
}

export function mergeAcceptedLabels(
  existing: AcceptedLabelDescriptor[],
  incoming: AcceptedLabelDescriptor[]
): MergeResult {
  const byKey = new Map<string, AcceptedLabelDescriptor>();

  const serialize = (descriptor: AcceptedLabelDescriptor) =>
    `${descriptor.recipeId}::${descriptor.controlId}::${JSON.stringify(descriptor.nextValue)}`;

  existing.forEach(descriptor => {
    byKey.set(serialize(descriptor), descriptor);
  });

  const added: AcceptedLabelDescriptor[] = [];

  incoming.forEach(descriptor => {
    const key = serialize(descriptor);
    if (!byKey.has(key)) {
      added.push(descriptor);
    }
    byKey.set(key, descriptor);
  });

  const merged = Array.from(byKey.values());
  merged.sort((a, b) => {
    if (a.recipeId === b.recipeId) {
      return a.controlId.localeCompare(b.controlId);
    }
    return a.recipeId.localeCompare(b.recipeId);
  });

  return { merged, added };
}

export async function writeAcceptedLabels(
  labels: AcceptedLabelDescriptor[],
  filePath?: string
): Promise<void> {
  const acceptedPath = resolvePath(filePath);
  await mkdir(path.dirname(acceptedPath), { recursive: true });
  const payload = `${JSON.stringify(labels, null, 2)}\n`;
  await writeFile(acceptedPath, payload, FILE_ENCODING);
}

export function formatSummary(added: AcceptedLabelDescriptor[]): string {
  if (!added.length) {
    return "No new labels accepted.";
  }

  const lines = added.map(descriptor => {
    const nextValue = typeof descriptor.nextValue === "string"
      ? descriptor.nextValue
      : JSON.stringify(descriptor.nextValue);
    return `- ${descriptor.recipeId} • ${descriptor.controlId} → ${nextValue} (${descriptor.notes})`;
  });

  return [
    "Accepted label decisions:",
    ...lines,
  ].join("\n");
}
