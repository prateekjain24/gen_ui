# Ticket PLAN2-10 — QA checklist & demo script

- **Story Points:** 1
- **Depends on:** PLAN2-07, PLAN2-08, PLAN2-09

## Goal
Produce a repeatable QA checklist and demo script to validate Canvas Chat end-to-end before sharing with stakeholders.

## Context
Plan2 emphasises a wow demo. Documenting QA steps ensures consistency (especially for junior engineers or PMs) and captures the scenarios highlighted in the plan.

## Requirements
1. Create `docs/canvas-chat-qa.md` including:
   - Pre-flight setup (env vars, feature flags).
   - Test matrix covering explorer/team/power flows, fallback path, error handling, reduced-motion mode, mobile viewport.
   - Expected UI elements per scenario (components, persona badge text, reasoning chip).
2. Add a “Demo script” section with recommended narrative (e.g., prompts to type, points to highlight, catwalk order).
3. Include verification step for telemetry (check log file or console output).
4. Update README quickstart section to link to the QA doc.

## Implementation Steps
1. Draft QA doc referencing recipes from `recipes.ts` (list expected components for each).
2. Add instructions for toggling `NEXT_PUBLIC_ENABLE_EXPERIMENTAL_COMPONENTS` and `NEXT_PUBLIC_CANVAS_CHAT`.
3. Document fallback test (simulate API failure by stopping dev server/using network throttling).
4. Update README with a short “Canvas Chat” blurb and link to QA doc.

## Definition of Done
- QA document lives at `docs/canvas-chat-qa.md` with comprehensive scenarios.
- README references Canvas Chat with link to QA doc.
- All links verified; markdown lint (if configured) passes.
