# Ticket PLAN2-02 — Recipe registry scaffolding

- **Story Points:** 1
- **Depends on:** PLAN2-01

## Goal
Define the deterministic recipes (R1–R4) that Canvas Chat will use to assemble UI, encoding them as typed data structures the rest of the system can reference.

## Context
Recipes map the classifier output to concrete form fields using the experimental component palette. These will be consumed by the Canvas Chat UI and later by the API response handler.

## Requirements
1. New module `src/lib/canvas/recipes.ts` exporting:
   - `CanvasRecipeId` union (`'R1' | 'R2' | 'R3' | 'R4'`).
   - `CanvasRecipe` interface (fields array, persona tag, default reasoning template, optional metadata like recommended CTA).
   - `RECIPES` record keyed by recipe id, each returning a `FormStep`-compatible structure (fields only; step metadata will be added by assembler).
2. Each recipe must use only supported field kinds (text, select, checkbox, callout, checklist, info_badge, ai_hint, integration_picker, teammate_invite, admin_toggle) and reference whitelisted field IDs.
3. Provide helper `getRecipe(id: CanvasRecipeId)` and `defaultRecipeId` (`'R1'`).
4. Include TypeScript doc comments summarising each recipe’s intent.
5. Unit test skeleton in `src/lib/canvas/__tests__/recipes.test.ts` verifying recipe count and that every field id exists in `FIELD_ID_SET`.

## Implementation Steps
1. Create `src/lib/canvas` directory (if absent) and add `recipes.ts` with interfaces/constants described above.
2. Encode the four recipes mirroring Plan2.md definitions (R1 explorer quick start, etc.).
3. Export recipe-level persona hints (e.g., `'explorer'`, `'team'`, `'power'`) for downstream UI.
4. Add simple tests asserting:
   - `Object.keys(RECIPES).length === 4`.
   - Every field in each recipe has `FIELD_ID_SET.has(field.id)`.
5. `bun run typecheck` and `bunx jest src/lib/canvas/__tests__/recipes.test.ts` to ensure coverage.

## Definition of Done
- `recipes.ts` exports typed recipes with doc comments and helper getters.
- Tests validate recipe count and field whitelist compliance.
- Recipes use only allowed field kinds and existing option sets.
- No lint/type/test failures.
