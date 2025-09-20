/**
 * @jest-environment node
 */

import {
  __resetTogglesForTesting,
  isLabelingReviewEnabled,
  isPersonalizationEnabled,
  isPromptIntelEnabled,
} from "../toggles";

describe("environment toggles", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    Object.assign(process.env, originalEnv);
    __resetTogglesForTesting();
    delete process.env.ENABLE_PROMPT_INTEL;
    delete process.env.ENABLE_PERSONALIZATION;
    delete process.env.ENABLE_LABELING_REVIEW;
  });

  afterAll(() => {
    Object.assign(process.env, originalEnv);
    __resetTogglesForTesting();
  });

  it("defaults prompt intel and personalization to enabled", () => {
    expect(isPromptIntelEnabled()).toBe(true);
    expect(isPersonalizationEnabled()).toBe(true);
  });

  it("defaults labeling review to disabled", () => {
    expect(isLabelingReviewEnabled()).toBe(false);
  });

  it("parses false-like values case-insensitively", () => {
    process.env.ENABLE_PROMPT_INTEL = "FALSE";
    process.env.ENABLE_PERSONALIZATION = "0";
    process.env.ENABLE_LABELING_REVIEW = "off";
    __resetTogglesForTesting();

    expect(isPromptIntelEnabled()).toBe(false);
    expect(isPersonalizationEnabled()).toBe(false);
    expect(isLabelingReviewEnabled()).toBe(false);
  });

  it("treats truthy values as enabled", () => {
    process.env.ENABLE_PROMPT_INTEL = "1";
    process.env.ENABLE_PERSONALIZATION = "true";
    process.env.ENABLE_LABELING_REVIEW = "YES";
    __resetTogglesForTesting();

    expect(isPromptIntelEnabled()).toBe(true);
    expect(isPersonalizationEnabled()).toBe(true);
    expect(isLabelingReviewEnabled()).toBe(true);
  });

  it("falls back to defaults for unexpected values", () => {
    process.env.ENABLE_PROMPT_INTEL = "maybe";
    process.env.ENABLE_LABELING_REVIEW = "n/a";
    __resetTogglesForTesting();

    expect(isPromptIntelEnabled()).toBe(true);
    expect(isLabelingReviewEnabled()).toBe(false);
  });
});
