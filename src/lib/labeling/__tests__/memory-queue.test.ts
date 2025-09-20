/**
 * @jest-environment node
 */

import { clearLabelCandidates, listLabelCandidates, pushLabelCandidate } from "../memory-queue";

describe("memory labeling queue", () => {
  const originalEnv = process.env.ENABLE_LABELING_REVIEW;

  const createCandidate = (index: number) => ({
    recipeId: `R${index}`,
    controlId: "copyTone",
    previousValue: `prev-${index}`,
    nextValue: `next-${index}`,
    signalsSummary: "[]",
    notes: `Candidate ${index}`,
  });

  beforeEach(() => {
    process.env.ENABLE_LABELING_REVIEW = "true";
    clearLabelCandidates();
  });

  afterEach(() => {
    clearLabelCandidates();
    if (originalEnv === undefined) {
      delete process.env.ENABLE_LABELING_REVIEW;
    } else {
      process.env.ENABLE_LABELING_REVIEW = originalEnv;
    }
  });

  it("caps the queue at 50 entries and keeps the newest items", () => {
    for (let index = 0; index < 60; index += 1) {
      pushLabelCandidate(createCandidate(index));
    }

    const stored = listLabelCandidates();

    expect(stored).toHaveLength(50);
    expect(stored[0]?.recipeId).toBe("R10");
    expect(stored[stored.length - 1]?.recipeId).toBe("R59");
    expect(stored.every(candidate => candidate.timestamp)).toBe(true);
  });

  it("clears the queue when requested", () => {
    pushLabelCandidate(createCandidate(1));
    expect(listLabelCandidates()).toHaveLength(1);

    clearLabelCandidates();
    expect(listLabelCandidates()).toHaveLength(0);
  });

  it("acts as a no-op when labeling is disabled", () => {
    delete process.env.ENABLE_LABELING_REVIEW;
    clearLabelCandidates();

    pushLabelCandidate(createCandidate(1));

    expect(listLabelCandidates()).toEqual([]);
  });
});
