# P1-017 – Onboarding Flow Orchestrator

## Objective
Replace the placeholder orchestrator with a client-side controller that manages onboarding state end-to-end. The component should own session lifecycle, hydrate `FormRenderer` with fresh plans, persist form values via the session API, and support forward/back navigation by coordinating with the rules-backed `/api/plan` endpoint.

## Acceptance Criteria Recap
- Main flow component with state management replacing the current placeholder.
- API integration that hydrates plans from `/api/plan` using the active session.
- Form values collected client-side and saved back to the server session store.
- Navigation between steps working for submit/continue and back actions.

## Key Workstreams
1. **Session Bootstrap & Persistence**
   - Add lightweight API helpers (e.g., `createSession`, `updateSession`, `getPlan`) to encapsulate fetch logic and error handling.
   - Generate/read a `sessionId` from `sessionStorage` so reloads stay in the same flow; fall back to POST `/api/sessions` when missing.
2. **OnboardingFlow State Machine**
   - Refactor `OnboardingFlow` into a client component with hooks for `sessionId`, `plan`, `isLoading`, and `error`.
   - On mount: ensure a session exists, then fetch the initial plan; expose a `refreshPlan` helper for reuse after updates.
3. **Action Handlers & Navigation**
   - Connect `FormRenderer` callbacks so `submit_step` persists values (`PUT /api/sessions` with `values`, `currentStep`, `addCompletedStep`) before fetching the next plan.
   - Implement `back` by trimming the server-side `completedSteps` (extend session update payload if needed) and requesting the prior plan.
   - Wire `skip`/`complete` actions to update the session appropriately (skip marks completion, complete moves to success state).
4. **Error & Loading UX**
   - Surface in-flight loading states via `FormContainer.isSubmitting` and show meaningful errors with retry affordances.
   - Add defensive guards (e.g., if the plan API returns non-200) to reset UI gracefully.
5. **Testing & Documentation**
   - Write React Testing Library specs for `OnboardingFlow` covering happy path, plan refresh, and back navigation logic (mock fetch).
   - Update `PHASE1.md` once behaviour is validated and record notes in `thoughts/P1-017_plan.md` if scope diverges.

## Task Breakdown
1. Scaffold API helper module for sessions/plan requests.
2. Persist/retrieve `sessionId` (local storage + server creation fallback).
3. Rebuild `OnboardingFlow` with hooks, wiring `FormRenderer` callbacks to orchestrator logic.
4. Extend session update route/types if back-navigation requires removing completed steps.
5. Handle action variants (`submit_step`, `back`, `skip`, `complete`) with proper sequencing and error states.
6. Add component tests using mocked fetch to validate flows and regression-proof the orchestrator.
7. Execute `bun run typecheck`, `bun run lint`, and `bunx jest` before finalizing.

## Risks & Mitigations
- **Back navigation with rules engine:** Removing completed steps may require API changes; coordinate updates carefully and add tests to ensure determinism.
- **Network race conditions:** Debounce/serialize plan requests to avoid stale updates—track `inFlight` state and ignore outdated responses.
- **Session loss on reload:** Ensure local storage reads are resilient (catch JSON errors) and recreate sessions when invalid.

## Definition of Done Checklist
- [ ] `OnboardingFlow` manages session + plan state with actionable UI.
- [ ] All primary actions (continue, back, skip, complete) persist to the session store and show correct next plan.
- [ ] API helpers centralize fetch logic with typed responses and error handling.
- [ ] Component tests cover success and failure flows.
- [ ] Lint, typecheck, and test suites remain green.
- [ ] Phase documentation updated to mark P1-017 complete.
