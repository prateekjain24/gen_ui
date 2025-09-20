/**
 * @jest-environment node
 */

import { clearLabelCandidates, listLabelCandidates, pushLabelCandidate } from "../memory-queue";

import { __resetTogglesForTesting } from "@/lib/config/toggles";

const originalEnv = { ...process.env };

const enableQueue = () => {
  process.env.ENABLE_LABELING_REVIEW = "true";
  __resetTogglesForTesting();
};

const disableQueue = () => {
  delete process.env.ENABLE_LABELING_REVIEW;
  __resetTogglesForTesting();
};

describe("memory labeling queue", () => {
  beforeEach(() => {
    Object.assign(process.env, originalEnv);
    clearLabelCandidates();
    enableQueue();
  });

  afterAll(() => {
    Object.assign(process.env, originalEnv);
    __resetTogglesForTesting();
  });

  it("caps the queue at 50 entries and keeps the newest items", () => {
    for (let index = 0; index < 60; index += 1) {
      pushLabelCandidate({
        recipeId: `R${index}`,
        controlId: "copyTone",
        previousValue: `prev-${index}`,
        nextValue: `next-${index}`,
        signalsSummary: "[]",
        notes: `Candidate ${index}`,
      });
    }

    const stored = listLabelCandidates();

    expect(stored).toHaveLength(50);
    expect(stored.every(candidate => candidate.id && candidate.timestamp)).toBe(true);
    expect(new Set(stored.map(candidate => candidate.id)).size).toBe(stored.length);
    expect(stored[0]?.recipeId).toBe("R10");
    expect(stored[stored.length - 1]?.recipeId).toBe("R59");
  });

  it("clears the queue when requested", () => {
    pushLabelCandidate({
      recipeId: "R1",
      controlId: "copyTone",
      previousValue: "prev",
      nextValue: "next",
      signalsSummary: "[]",
      notes: "Candidate",
    });

    expect(listLabelCandidates()).toHaveLength(1);

    clearLabelCandidates();
    expect(listLabelCandidates()).toHaveLength(0);
  });

  it("acts as a no-op when labeling is disabled", () => {
    disableQueue();
    clearLabelCandidates();

    pushLabelCandidate({
      recipeId: "R1",
      controlId: "copyTone",
      previousValue: "prev",
      nextValue: "next",
      signalsSummary: "[]",
      notes: "Candidate",
    });

    expect(listLabelCandidates()).toEqual([]);
  });
});
