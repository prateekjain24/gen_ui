# Ticket PLAN4-22 — Runtime policies for richer LLM usage

- **Story Points:** 1
- **Depends on:** PLAN4-03, PLAN4-12

## Goal
Tune runtime policies (timeouts, retries, rate limiting) to support higher-volume LLM usage introduced in Phase 4 while maintaining system stability.

## Context
Personalization makes more frequent and heavier LLM calls. We need explicit guardrails so the service degrades gracefully under load.

## Requirements
1. Increase classifier/template fill timeouts to 30s and adjust retry backoff to accommodate longer generations.
2. Implement per-session rate limiting (e.g., max 5 personalization requests per minute) to prevent abuse.
3. Add circuit-breaker logic that temporarily disables personalization when repeated failures occur, logging the reason.
4. Expose current policy values via debug HUD and environment docs.
5. Cover policy behavior with integration tests or mocked timers to ensure limits trigger correctly.

## Implementation Steps
1. Update existing `invokeWithTimeout` usage to accept configurable thresholds (default 30s) and adjust config constants.
2. Implement rate limiter middleware or utility keyed by session id.
3. Integrate circuit breaker that monitors consecutive failures and toggles feature flags temporarily.
4. Surface policy values in the debug UI for transparency.
5. Write tests simulating burst requests and repeated failures to ensure policies activate.

## Definition of Done
- Timeouts and backoff values reflect Phase 4 needs.
- Rate limiting and circuit breaker logic protect the system.
- Debug HUD and docs show the policies.
- Tests confirm the policies engage under stress conditions.
