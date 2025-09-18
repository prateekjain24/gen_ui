# P1-019 – Basic Testing Suite

## Objective
Round out the Phase 1 automated tests to cover the critical core: rules engine determinism, session store behaviour, and type guard validation. Establish a sustainable coverage baseline (≥80%) that catches regressions as the orchestrator and telemetry mature.

## Acceptance Criteria Breakdown
- Unit tests exist for the rules engine’s decision paths (already partially present) and remain green after changes.
- Session store unit tests cover creation, updates (including recent completed-step replacement), event queuing limits, and expiry logic.
- Type validation tests exercise key guards (`isSessionState`, `isRenderStepPlan`, etc.).
- Jest coverage target ≥80% overall (verify locally and document command).

## Approach
1. **Augment Existing Suites**
   - Extend `rules.test.ts` with personas/skip-step assertions if gaps remain, keeping focus on P1 deterministic logic.
   - Update `session.test.ts` for the new `completedSteps` overwrite behaviour.
2. **Type Guard Tests**
   - Add `src/lib/types/__tests__/session.test.ts` (or similar) verifying `isSessionState`, `isUserPersona`, `isRenderStepPlan`, etc.
3. **Coverage Command**
   - Run `bunx jest --coverage` and confirm the threshold; if under 80%, add targeted tests until threshold reached.

## Tasks
1. Review coverage report to identify uncovered lines (rules skip branches, session update overrides, telemetry utils once added).
2. Add/extend tests accordingly, mocking dependencies where required.
3. Update documentation (PHASE1.md) noting completion and the coverage command to rerun.
4. Ensure typecheck/lint/jest all pass with coverage run.

## Risks
- New async code (telemetry queue) may require additional mocking to keep tests deterministic.
- Maintaining ≥80% coverage may require future enforcement (CI threshold) – note for later phases.

## Definition of Done
- [x] All acceptance bullets satisfied with automated tests checked in.
- [x] Coverage command documented and producing ≥80% locally.
- [x] Phase document updated.
