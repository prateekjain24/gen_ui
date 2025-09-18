# P1-013 – Events API Endpoint Plan

## Objective
Deliver a resilient `/api/events` POST handler that ingests batched `UXEvent` payloads, ties them to existing sessions, performs lightweight heuristics, and returns actionable insights for the onboarding telemetry pipeline.

## Acceptance Criteria Recap
- Endpoint created under `src/app/api/events/route.ts` using Next.js App Router conventions.
- Request body validation and normalization applied (session ID + array of events).
- Events batch stored against the session through the existing `sessionStore` helpers.
- Basic pattern analysis runs on the accepted events and surfaces insights in the JSON response.

## Key Workstreams
1. **Schema Validation & Normalization**
   - Define a Zod schema (`EventBatchSchema`) that enforces a trimmed `sessionId` and an `events` array of discriminated objects aligned with `UXEvent` shapes (minimum: `type`, `timestamp`, optional field/step metadata).
   - Coerce timestamps to ISO strings and ensure each event inherits the request `sessionId`.
2. **Session Gating & Ingestion**
   - Look up the session via `sessionStore.getSession`; return 404 if missing/expired.
   - On success, push events via `sessionStore.addEvents`, capturing how many were accepted and skipping malformed items defensively.
   - Guard against oversized batches by capping to `SESSION_CONFIG.MAX_EVENTS_PER_SESSION` and trimming extras before insert.
3. **Pattern Analysis Heuristics**
   - Introduce a small analyzer (`analyzeEvents.ts`) under `src/lib/telemetry` to keep logic reusable.
   - Derive insights such as `totalEvents`, `typeCounts`, `fieldsWithHesitation` (e.g. blur events with `timeSpentMs` above threshold), `validationErrorCount`, and `recentStepActivity`.
   - Ensure analysis is synchronous and O(n) to satisfy the “lightweight” requirement.
4. **Response & Instrumentation**
   - Return `200` with `{ acceptedCount, insights, receivedAt }` on success.
   - Emit `400` for schema issues and `500` for unexpected failures, using `createDebugger('EventsAPI')` for diagnostics and `debugError` for fatal paths.
   - Consider queueing background follow-ups with `setImmediate` for any future async hooks without blocking the response.
5. **Test Coverage**
   - Add Jest tests in `src/app/api/events/__tests__/route.test.ts` that mock the session store:
     - invalid JSON / schema → 400,
     - nonexistent session → 404,
     - happy path returns insights with accepted count,
     - partial batches (e.g., more than MAX_EVENTS) correctly truncated.
   - Verify the analyzer outputs expected flags for crafted event sequences.

## Task Breakdown
1. Scaffold analysis helper and export signature (`analyzeEvents(events: UXEvent[]): EventInsights`).
2. Build Zod schema + normalization utilities within the route module (or shared helper).
3. Implement the POST handler: parse body, validate, fetch session, ingest, analyze, respond.
4. Wire debug logging and graceful error handling (try/catch with structured errors).
5. Write unit tests covering handler and analyzer logic; mock timers where necessary for deterministic thresholds.
6. Run `bun run typecheck`, `bun run lint`, and `bunx jest` to ensure regressions are caught.
7. Update `PHASE1.md` progress notes after verification.

## Risks & Mitigations
- **Out-of-order or stale events:** sort or respect provided timestamps before analysis; document assumption and clamp insights to latest window.
- **Malformed event payloads:** schema uses safe parsing + defensive optional chaining before accessing fields.
- **Large event bursts:** enforce batch size limits and short-circuit after hitting `MAX_EVENTS_PER_SESSION` to prevent memory pressure.

## Definition of Done Checklist
- [ ] `/api/events` returns 200/400/404/500 with correct shapes.
- [ ] Events stored against sessions with enforced batch limits.
- [ ] Analyzer surfaces the agreed insight fields without exceeding O(n) complexity.
- [ ] New Jest tests pass and cover success + failure paths.
- [ ] Lint, typecheck, and test suites succeed locally.
