/**
 * @jest-environment node
 */

import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  formatSummary,
  mergeAcceptedLabels,
  readAcceptedLabels,
  toAcceptedDescriptor,
  writeAcceptedLabels,
} from "../accepted-store";

import type { LabelQueueItem } from "@/lib/labeling/types";

describe("accepted label store", () => {
  it("merges incoming descriptors without duplicates", () => {
    const base = [
      { recipeId: "R1", controlId: "copyTone", nextValue: "collaborative", notes: "Baseline" },
    ];

    const candidate: LabelQueueItem = {
      id: "id-1",
      recipeId: "R1",
      controlId: "copyTone",
      previousValue: "baseline",
      nextValue: "trusted-advisor",
      signalsSummary: "[]",
      timestamp: new Date().toISOString(),
      notes: "Upgrade",
    };

    const { merged, added } = mergeAcceptedLabels(base, [toAcceptedDescriptor(candidate)]);

    expect(merged).toHaveLength(2);
    expect(added).toHaveLength(1);
    expect(merged.some(entry => entry.nextValue === "trusted-advisor")).toBe(true);
  });

  it("writes and reads accepted labels from disk", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "accepted-store-"));
    const filePath = path.join(directory, "accepted.json");
    const labels = [
      { recipeId: "R1", controlId: "copyTone", nextValue: "governed", notes: "Enterprise" },
    ];

    await writeAcceptedLabels(labels, filePath);

    const content = await readFile(filePath, "utf8");
    expect(content.trim()).toBe(JSON.stringify(labels, null, 2));

    const loaded = await readAcceptedLabels(filePath);
    expect(loaded).toEqual(labels);
  });

  it("formats summaries for release notes", () => {
    const summary = formatSummary([
      { recipeId: "R2", controlId: "inviteStrategy", nextValue: "staggered", notes: "Pilot feedback" },
    ]);

    expect(summary).toContain("R2");
    expect(summary).toContain("inviteStrategy");
    expect(summary).toContain("Pilot feedback");
  });
});
