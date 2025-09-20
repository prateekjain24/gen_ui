# Ticket PLAN4-22 — Runtime policies for richer LLM usage

- **Story Points:** 1
- **Depends on:** PLAN4-03, PLAN4-12

## Goal
Ship pragmatic runtime guardrails sized for MVP traffic: simple timeouts, per-request failsafes, and clear logging—nothing over-engineered.

## Context
Railway deployments run on a single container with limited concurrency. Instead of building a full circuit breaker, we just need basic timeouts and a temporary “disable personalization” path when errors spike.

## Requirements
1. Standardize all OpenAI/personalization calls on a shared `withTimeout` helper defaulting to 15s; configurable via `PERSONALIZATION_TIMEOUT_MS` env var.
2. Track consecutive personalization errors in memory and, after 3 failures within a 2-minute window, flip `ENABLE_PERSONALIZATION` off (reuse the toggle helper) until the process restarts.
3. Log a single structured warning (`console.warn`) when the soft-disable occurs so Railway logs capture the state.
4. Add a lightweight request counter per session (store in `Map<sessionId, count>`) and reject requests after 5 attempts/minute with a 429 response.
5. Document these policies in the README “Runtime guardrails” section so reviewers know the exact numbers.

## Implementation Steps
1. Create `src/lib/runtime/with-timeout.ts` wrapping a promise with `AbortController`; respect the env override.
2. Add `src/lib/runtime/personalization-health.ts` that exposes `trackFailure()` and `canProcessRequest(sessionId)` used by the API route.
3. Update the personalization handler to call the helpers, returning a friendly JSON error plus the `Retry-After` header when rate limited.
4. Emit the disable warning exactly once by guarding with a module-scoped boolean.
5. Cover the helpers with unit tests using fake timers to ensure the thresholds behave as expected.

## Definition of Done
- Personalization requests time out at 15s by default and respect the env override.
- After repeated failures, the handler stops processing and logs the reason without crashing the app.
- Basic per-session rate limiting prevents runaway loops.
- README (or a dedicated doc) lists the chosen timeout, failure, and rate limits so ops can adjust them later.
