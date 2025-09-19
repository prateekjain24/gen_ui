# Ticket PLAN4-07 — Personalization scoring engine

- **Story Points:** 1
- **Depends on:** PLAN4-04, PLAN4-06

## Goal
Create the scoring layer that maps prompt signals to recipe knob values, yielding a parameterized plan tailored to the user brief.

## Context
With signals and knobs defined, we need deterministic code that decides how to adjust each knob based on confidence, persona, and detected constraints. This sets the stage for later UI tweaks.

## Requirements
1. Introduce `src/lib/personalization/scoring.ts` exporting `scoreRecipeKnobs(recipeId: CanvasRecipeId, signals: PromptSignals): RecipeKnobOverrides`.
2. Encode scoring rules that translate signals into adjustments (e.g., governance keywords raise `approvalChainLength`, Slack+Jira picks `integrationMode: 'multi-tool'`).
3. Support confidence weighting: ignore low-confidence signals (<0.4) unless corroborated by another source.
4. Emit per-knob rationale for telemetry (why the value changed) and mark when defaults were preserved.
5. Cover scoring logic with focused unit tests in `src/lib/personalization/__tests__/scoring.test.ts`.

## Implementation Steps
1. Define TypeScript types for overrides, rationales, and confidence thresholds.
2. Implement rule functions per knob using the taxonomy from PLAN4-01.
3. Add logging hooks for debugging adjustments.
4. Write tests covering high/low confidence inputs, conflicting signals, and default pass-through.
5. Run `bun run typecheck` and the new jest suite to validate behavior.

## Definition of Done
- Scoring engine produces deterministic knob overrides with rationales.
- Low-confidence signals are appropriately ignored.
- Tests validate decision logic across representative scenarios.
