# Ticket PLAN2-08 — Telemetry & eval logging

- **Story Points:** 1
- **Depends on:** PLAN2-06, PLAN2-07

## Goal
Capture Canvas Chat decisions for analytics and evals: log user message, selected recipe, persona, component count, confidence, and whether fallback was used.

## Context
Plan2.md stresses observability. We already have an eval logger; extend it so Canvas Chat sends structured events, and surface minimal telemetry to the frontend (for future dashboards).

## Requirements
1. Extend eval logger (`src/lib/llm/eval-logger.ts`) to accept Canvas-specific payloads (e.g., `logCanvasDecision`).
2. API endpoint (PLAN2-06) should call new logger with message, recipe id, persona, tags, confidence, decision source.
3. Frontend should push a telemetry event when a recipe renders (can reuse existing telemetry queue). Include `componentCount` (fields length) and `decisionSource`.
4. Update Airtable sync script (if necessary) to recognise new columns (document expectation if script updated separately).
5. Add tests verifying logger writes JSON line with required keys.

## Implementation Steps
1. Modify `eval-logger.ts` to add interface `CanvasDecisionLog` and `logCanvasDecision` function.
2. Update API route to call `logCanvasDecision` before responding (only when logging enabled).
3. In `CanvasChat` component, queue telemetry event via `telemetryQueue.enqueue` (if available) or stub for now; ensure this is gated for environments where telemetry is disabled.
4. Add tests under `src/lib/llm/__tests__/eval-logger.test.ts` for the new helper.
5. Document new JSON fields in `docs/component-palette-expansion.md` or new doc if more appropriate.

## Definition of Done
- Eval logs include Canvas decisions when ENABLE_EVAL_LOGGING is true.
- Frontend telemetry event fires once per rendered plan (component count recorded).
- Tests pass and lint/typecheck clean.
