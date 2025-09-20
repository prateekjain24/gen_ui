/**
 * @jest-environment node
 */

import { withTimeout, getDefaultTimeoutMs } from "../with-timeout";

jest.mock("@/lib/llm/client", () => ({
  invokeWithTimeout: jest.fn((timeoutMs: number, operation: (signal: AbortSignal) => Promise<unknown>) => operation(new AbortController().signal)),
}));

const { invokeWithTimeout } = jest.requireMock("@/lib/llm/client");

describe("withTimeout", () => {
  const originalEnv = process.env.PERSONALIZATION_TIMEOUT_MS;

  afterEach(() => {
    process.env.PERSONALIZATION_TIMEOUT_MS = originalEnv;
    jest.clearAllMocks();
  });

  it("uses the default timeout when no env override is provided", async () => {
    await withTimeout(async () => "ok");
    expect(invokeWithTimeout).toHaveBeenCalledWith(15_000, expect.any(Function));
  });

  it("honours a valid env override", async () => {
    process.env.PERSONALIZATION_TIMEOUT_MS = "9000";
    await withTimeout(async () => "ok");
    expect(invokeWithTimeout).toHaveBeenCalledWith(9_000, expect.any(Function));
  });

  it("prefers an explicit override over env configuration", async () => {
    process.env.PERSONALIZATION_TIMEOUT_MS = "5000";
    await withTimeout(async () => "ok", { timeoutMs: 2_000 });
    expect(invokeWithTimeout).toHaveBeenCalledWith(2_000, expect.any(Function));
  });

  it("supports disabling the timeout when override is zero", async () => {
    await withTimeout(async () => "ok", { timeoutMs: 0 });
    expect(invokeWithTimeout).toHaveBeenCalledWith(0, expect.any(Function));
  });

  it("allows disabling via env override", async () => {
    process.env.PERSONALIZATION_TIMEOUT_MS = "0";
    await withTimeout(async () => "ok");
    expect(invokeWithTimeout).toHaveBeenCalledWith(0, expect.any(Function));
  });

  it("exposes the resolved default timeout", () => {
    process.env.PERSONALIZATION_TIMEOUT_MS = "2500";
    expect(getDefaultTimeoutMs()).toBe(2_500);
  });
});
