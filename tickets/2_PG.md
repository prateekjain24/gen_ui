# PropertyGuru signal extractor

## Context
With the signal schema defined, we need deterministic population of those fields from a seeker’s free-form brief. The current extractor targets B2B tool stacks and approvals, so PropertyGuru prompts either misclassify or drop key cues. pg.md also insists on telemetry for extraction confidence.

## Task
Implement a PropertyGuru-focused extractor that ingests prompt text and returns a typed `PropertyGuruSignals` object while emitting confidence telemetry.

## Acceptance Criteria
- New helper (e.g. `src/lib/utils/propertyGuruSignals.ts`) accepts raw seeker prompts and returns `PropertyGuruSignals` populated for location, budget, property type, bedrooms, move-in horizon, lifestyle cues, finance readiness, tone hints.
- Handles currency parsing (SGD variants), neighborhood/district keywords, and lifestyle phrases (schools, MRT, pet-friendly, accessibility) via heuristics plus optional LLM schema wrapper.
- Emits a telemetry event (reusing existing signal logging hook) containing extracted signals and confidence/fallback metadata.
- Jest coverage: at least three fixtures (urgent twins, split-city worker, investor) asserting parsed output and telemetry stub.

## Out of Scope
- Wiring into UI or prompt loop; only the extractor module + tests.
