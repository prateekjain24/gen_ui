# PropertyGuru plan → search payload mapper

## Context
pg.md specifies that every generated plan should hand PropertyGuru search a structured payload (`filters`, `highlights`, `nextSteps`, `copy`). Without a mapper, engineers will duplicate logic or ship brittle integrations.

## Task
Build a utility that converts the PropertyGuru plan structure into the JSON payload expected by search and marketing surfaces, with fallbacks and telemetry.

## Acceptance Criteria
- Utility lives in `src/lib/utils/propertyGuruPlanMapper.ts` (or similar) and accepts the new plan format, returning `{ filters, highlights, nextSteps, copy }` aligned with PropertyGuru API expectations (district codes, price bands, bedroom counts, lifestyle tags).
- Handles optional/unknown fields gracefully by applying defaults and flagging them in telemetry.
- Emits a telemetry record when defaults or fallbacks are used so ops can monitor plan quality.
- Jest tests cover at least two plan fixtures (e.g. twins near Tampines, investor yield hunt) asserting payload correctness.

## Out of Scope
- Actual API calls or UI rendering; this is pure data transformation.
