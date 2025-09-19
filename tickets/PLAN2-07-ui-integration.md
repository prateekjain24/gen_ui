# Ticket PLAN2-07 — Canvas Chat UI ↔ plan integration

- **Story Points:** 1
- **Depends on:** PLAN2-01, PLAN2-02, PLAN2-03, PLAN2-04, PLAN2-06

## Goal
Wire the Canvas Chat client component to call `/api/canvas/plan`, map the response to a recipe, and render the assembled form (with animations) via `FormRenderer`.

## Context
After the user submits a message, we need to fetch the plan, show loading state, handle errors, and display the persona badge + reasoning chip + assembled fields.

## Requirements
1. Update `CanvasChat` component to:
   - POST to `/api/canvas/plan` with `{ message }`.
   - Show loading indicator (button spinner + placeholder shimmer) while awaiting response.
   - On success, look up the recipe via `getRecipe` and store the plan state (`{ recipeId, persona, fields, intentTags, reasoning, decisionSource }`).
   - Render persona badge, reasoning chip, and pass fields to `FormRenderer` (likely via adapters to `FormPlan`).
   - On error, display toast/banner with retry CTA and preserve input value.
2. Support the example chips (when clicked, fill input and auto-submit).
3. Ensure plan re-renders resets animation (use recipeId key).
4. Respect experimental component flag; if disabled, degrade gracefully (render simple fallback message).
5. Telemetry: console log can remain for now; actual logging handled in separate ticket.

## Implementation Steps
1. Add local state: `input`, `isLoading`, `error`, `currentPlan` (custom type).
2. Implement `fetchPlan` helper using `fetch` with `Content-Type: application/json`.
3. Translate recipe fields into a temporary `FormPlan` (reuse `FormRenderer` expecting `render_step` with single step). You can map to `stepId: 'workspace'` for now.
4. Insert persona badge + reasoning chip above the form container when plan present.
5. Reset error state on new submissions; on catch, set error message and focus input.
6. Manual test for different inputs (simulate by editing heuristics if LLM not ready).

## Definition of Done
- Submitting input triggers loading indicator and renders appropriate recipe once response arrives.
- Example chips auto-populate and submit successfully.
- Errors surface in UI, allowing manual retry without page reload.
- Animations trigger when new recipe arrives (ties into PLAN2-05).
- No console errors; typecheck passes.
