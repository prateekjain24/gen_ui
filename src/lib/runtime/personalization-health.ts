import { __resetTogglesForTesting } from "@/lib/config/toggles";

const FAILURE_THRESHOLD = 3;
const FAILURE_WINDOW_MS = 120_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 5;

let failureTimestamps: number[] = [];
let softDisabled = false;
let warningLogged = false;

const sessionRequests = new Map<string, number[]>();

const softDisablePersonalization = () => {
  if (softDisabled) {
    return;
  }

  softDisabled = true;
  process.env.ENABLE_PERSONALIZATION = "false";
  __resetTogglesForTesting();

  if (!warningLogged) {
    console.warn("personalization-soft-disabled", {
      reason: "consecutive_failures",
      failures: FAILURE_THRESHOLD,
      windowMs: FAILURE_WINDOW_MS,
      timestamp: new Date().toISOString(),
    });
    warningLogged = true;
  }
};

const pruneOldFailures = (currentTime: number) => {
  failureTimestamps = failureTimestamps.filter(timestamp => currentTime - timestamp <= FAILURE_WINDOW_MS);
};

export function trackPersonalizationSuccess(): void {
  failureTimestamps = [];
}

export function trackFailure(): void {
  const now = Date.now();
  failureTimestamps.push(now);
  pruneOldFailures(now);

  if (failureTimestamps.length >= FAILURE_THRESHOLD) {
    softDisablePersonalization();
  }
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs?: number;
}

export function canProcessRequest(sessionId: string | undefined): RateLimitResult {
  if (!sessionId) {
    return { allowed: true };
  }

  const now = Date.now();
  const windows = sessionRequests.get(sessionId) ?? [];
  const recent = windows.filter(timestamp => now - timestamp <= RATE_LIMIT_WINDOW_MS);

  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    const oldest = recent[0] ?? now;
    const retryAfterMs = Math.max(0, RATE_LIMIT_WINDOW_MS - (now - oldest));
    sessionRequests.set(sessionId, recent);
    return { allowed: false, retryAfterMs };
  }

  recent.push(now);
  sessionRequests.set(sessionId, recent);
  return { allowed: true };
}

export function resetPersonalizationHealthForTesting(): void {
  failureTimestamps = [];
  sessionRequests.clear();
  softDisabled = false;
  warningLogged = false;
}

export function isPersonalizationSoftDisabled(): boolean {
  return softDisabled;
}
