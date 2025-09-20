# PropertyGuru flow playbook fixtures

## Context
pg.md walks through five signature seeker journeys (twins, split-city worker, investor, multi-gen, first-time buyer). They currently live as prose only, so engineers and QA lack executable fixtures to regression-test the PropertyGuru preset or to rehearse the flows before launch.

## Task Breakdown
1. Create a dedicated Jest suite (e.g. `src/lib/store/__tests__/property-guru-flows.test.ts`) that loads each playbook prompt, invokes the PropertyGuru preset, and snapshots both the extracted signals and the `propertyGuruSearchPayload` produced by the plan mapper.
2. Store the prompts and expected payloads in fixtures under `src/lib/store/__tests__/__fixtures__/property-guru/` so future tickets can reuse them.
3. Add targeted assertions that the plan copy includes the expected CTA labels (saved search, mortgage, preschool brief, etc.) called out in pg.md so the flows stay coherent as prompts evolve.
4. Author a QA crib sheet (`docs/property-guru-flow-checklist.md`) outlining manual steps to replay each flow in the UI with the feature flag enabled, including which drawer knobs to adjust and what success looks like.

## Acceptance Criteria
- Jest suite passes under `bunx jest src/lib/store/__tests__/property-guru-flows.test.ts` without network calls; snapshots capture signals + plan payloads for all five personas.
- Fixtures cover the drawers/CTA expectations so regressions in tone, payload fields, or CTAs fail loudly.
- Documentation links to the prompts, how to toggle the preset locally, and the manual verification checklist for design/QA.

## Out of Scope
- Building automated Playwright flows; this ticket delivers deterministic fixtures and manual QA guidance only.
