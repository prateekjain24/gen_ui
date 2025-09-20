# PropertyGuru flow playbook fixtures

## Context
pg.md lists five exemplar flows (twins, split-city worker, investor, multi-gen, first-time buyer) that should guide design and QA. Today they exist only as prose, so engineers/testers lack canonical inputs and expected outputs to validate the preset.

## Task
Codify the flow playbooks as test fixtures and lightweight QA guidance so future changes can regression-test the PropertyGuru experience.

## Acceptance Criteria
- Add fixture prompts and expected signal/plan snapshots for the five flows under `src/lib/store/__tests__/propertyGuruFlows.test.ts` (or similar), using the PropertyGuru preset.
- Each fixture asserts both extracted signals and key plan sections/CTAs to ensure end-to-end coherence.
- Provide a short QA checklist (README snippet or `.md` under `docs/`) describing how to manually walk the flows in the UI with the feature flag on.
- Tests run under `bunx jest` without additional network calls.

## Out of Scope
- New UI automation; this ticket focuses on unit/snapshot fixtures and manual QA notes.
