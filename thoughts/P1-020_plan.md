# P1-020 – Dev Environment & Documentation Plan

## Objective
Finish Phase 1 by rounding out the developer experience: provide a frictionless local setup, surface runtime context via a debug panel, and document the project so new contributors can be productive quickly.

## Acceptance Criteria Snapshot
- Development server should run predictably with clear scripts.
- A development-only debug panel exposes session + plan context.
- README describes setup, scripts, and troubleshooting steps.
- Complex runtime logic gains clarifying comments.

## Workstreams
1. **Developer Tooling Scripts** – Audit `package.json` and add missing commands (`test`, coverage, debug-friendly dev entry point) so common workflows are one-liners.
2. **Debug Panel UX** – Create a lightweight inspector component that renders only when `NODE_ENV=development` or `NEXT_PUBLIC_DEBUG=true`, showing session ID, plan source, request state, and the latest plan payload.
3. **Code Hygiene** – Annotate dense orchestration code (e.g., telemetry wiring inside `OnboardingFlow`) with concise comments that explain intent without restating the obvious.
4. **Documentation Refresh** – Rewrite `README.md` to cover prerequisites, environment variables, scripts, troubleshooting, and the new debug flag; keep it concise and repository-specific.
5. **Verification** – Run `bun run typecheck`, lint, and tests to ensure added scripts work and code remains healthy.

## Risks & Mitigations
- **Debug panel leaking to production:** gate all debug UI behind explicit environment checks.
- **Script portability issues:** avoid bash-only syntax; rely on package runner semantics or document shell-specific commands if unavoidable.
- **Documentation drift:** cross-reference `PHASE1.md` and constants to ensure instructions match reality.

## Definition of Done
- Debug inspector rendered in dev builds only.
- `bun run dev`, `bun run dev:debug`, `bun run test`, and `bun run test:coverage` succeed.
- README reflects current setup and troubleshooting guidance.
- All automated checks pass.
