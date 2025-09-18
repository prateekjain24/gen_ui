# P1-012 – Plan API Endpoint

## Objective
Expose a deterministic plan-generation API for the onboarding flow. The `/api/plan` endpoint should validate requests, fetch the session, and return the next `FormPlan` produced by the rules engine. This completes the Phase 1 backend surface needed by the UI orchestrator.

## Acceptance Criteria Recap
- POST `/api/plan` route implemented using Next.js App Router handlers.
- Request body validated (must include `sessionId`).
- Session is retrieved/created successfully via `sessionStore`.
- Response contains the rules-engine plan, including decision source metadata.

## Key Workstreams
1. **Route Handler Skeleton**
   - Create `src/app/api/plan/route.ts` using Next.js 15 handler signature.
   - Import `sessionStore` and `getNextStepPlan` utilities.

2. **Request Validation**
   - Parse JSON body; enforce presence of `sessionId`.
   - Return 400 responses with JSON payload for validation failures.

3. **Session Retrieval**
   - Fetch session via `sessionStore.getSession`.
   - Return 404 if session is missing/expired.

4. **Plan Generation**
   - Call `getNextStepPlan(session)`.
   - Handle `null`/error cases with 500 responses.
   - Include source metadata (e.g., `{ plan, source: 'rules' }`).

5. **Logging & Telemetry**
   - Use `createDebugger` logger for development visibility.
   - Optionally emit console warnings for slow responses.

6. **Testing**
   - Add Jest tests that mock `sessionStore.getSession` + `getNextStepPlan` to assert success and failure paths.
   - Include integration coverage if feasible (e.g., hitting the handler with `NextRequest` mocks).

## Task Breakdown
1. Scaffold route handler file with POST method.
2. Implement body parsing and validation.
3. Hook into session store; handle missing session.
4. Invoke rules engine and format success/failure responses.
5. Add tests under `src/app/api/plan/__tests__/route.test.ts` (or similar) covering:
   - Missing `sessionId` → 400
   - Missing session → 404
   - Successful plan generation → 200 with plan payload
   - Rules engine returning null → 500
6. Run `bun run typecheck`, `bun run lint`, and `bunx jest` for new tests.
7. Update `PHASE1.md` status once validated.

## Risks & Mitigations
- **Session race conditions:** Rules engine is stateless; ensure we read session immediately before plan generation.
- **Validation drift:** Consider factoring validation schema so Phase 2 AI route can reuse.
- **Error leakage:** Make sure we don’t surface raw errors to clients—wrap in generic messages.

## Definition of Done Checklist
- [ ] POST `/api/plan` handler returns deterministic plans with `source: 'rules'`.
- [ ] Handler responds with proper 4xx/5xx codes for invalid requests or missing sessions.
- [ ] Automated tests cover success and failure scenarios.
- [ ] Lint/typecheck/test suites pass.
- [ ] `PHASE1.md` marks P1-012 as complete with any relevant notes.
