/**
 * @jest-environment node
 */

import {
  canProcessRequest,
  isPersonalizationSoftDisabled,
  resetPersonalizationHealthForTesting,
  trackFailure,
  trackPersonalizationSuccess,
} from "../personalization-health";

import { __resetTogglesForTesting } from "@/lib/config/toggles";

jest.mock("@/lib/config/toggles", () => ({
  __resetTogglesForTesting: jest.fn(),
}));

describe("personalization-health", () => {
  const originalEnv = process.env.ENABLE_PERSONALIZATION;

  const originalWarn = console.warn;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2024-01-01T00:00:00Z"));
    resetPersonalizationHealthForTesting();
    process.env.ENABLE_PERSONALIZATION = "true";
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    resetPersonalizationHealthForTesting();
    process.env.ENABLE_PERSONALIZATION = originalEnv;
    jest.restoreAllMocks();
    console.warn = originalWarn;
  });

  it("allows up to five requests per minute per session", () => {
    const sessionId = "session-1";
    for (let index = 0; index < 5; index += 1) {
      expect(canProcessRequest(sessionId).allowed).toBe(true);
    }

    const limited = canProcessRequest(sessionId);
    expect(limited.allowed).toBe(false);
    expect(limited.retryAfterMs).toBeGreaterThan(0);
  });

  it("resets the rate limit window after one minute", () => {
    const sessionId = "session-2";
    for (let index = 0; index < 5; index += 1) {
      expect(canProcessRequest(sessionId).allowed).toBe(true);
    }

    jest.advanceTimersByTime(61_000);

    expect(canProcessRequest(sessionId).allowed).toBe(true);
  });

  it("soft-disables personalization after three failures within the window", () => {
    trackFailure();
    jest.advanceTimersByTime(30_000);
    trackFailure();
    jest.advanceTimersByTime(30_000);
    trackFailure();

    expect(isPersonalizationSoftDisabled()).toBe(true);
    expect(process.env.ENABLE_PERSONALIZATION).toBe("false");
    expect(__resetTogglesForTesting).toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledTimes(1);
  });

  it("resets failures after a success", () => {
    trackFailure();
    trackFailure();
    trackPersonalizationSuccess();

    jest.advanceTimersByTime(10_000);
    trackFailure();
    expect(isPersonalizationSoftDisabled()).toBe(false);
  });
});
