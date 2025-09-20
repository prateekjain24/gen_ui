# PropertyGuru signal schema

## Context
pg.md calls for shared typed signals so every team (LLM prompting, UI, telemetry) speaks the same vocabulary. Today the B2B `WorkspaceSignals` object is hard-coded; PropertyGuru cues (location focus, budget, bedrooms, lifestyle preferences) only exist in narrative docs, which blocks downstream work and risks magic strings.

## Task
Define and export a `PropertyGuruSignals` contract plus supporting enums/lookup tables that downstream code can consume without guessing keys or values.

## Acceptance Criteria
- `src/lib/types` (or closest shared types module) exposes a typed shape for `PropertyGuruSignals` covering: location focus, price band, property type, bedrooms, move-in horizon, lifestyle cues, finance readiness, tone preference.
- `src/lib/constants` (or similar) publishes canonical lists/enums for lifestyle cues, property types, and tone presets so UI, extractor, and prompts stay aligned.
- Add a unit test or snapshot under `src/lib/store/__tests__` that instantiates a sample signal object (e.g. urgent Tampines MRT seeker) to lock the schema.
- Inline doc comment or README blurb points other tickets to reuse this contract (no ad hoc property names).

## Out of Scope
- Writing extraction logic or prompts; handled in follow-on tickets.
