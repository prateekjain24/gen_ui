# Ticket PLAN2-01 — Canvas Chat route shell

- **Story Points:** 1
- **Depends on:** none

## Goal
Create the initial `/canvas` page that hosts the Canvas Chat experience: centered chat input, example chips, and a placeholder area where the assembled UI will render. This gives product/design something tangible to iterate on before wiring LLM logic.

## Context
Plan2.md defines Canvas Chat as a single-input experience that materialises a tailored onboarding flow. We need a dedicated page and container components so later tickets can plug in recipes, API calls, and animations.

## Requirements
1. New `src/app/canvas/page.tsx` using Next App Router conventions.
2. Page renders a full-height layout with:
   - Header copy (`What do you want to get done today?`).
   - Text input (unstyled `Textarea` or `Input` for now) with submit button.
   - Three helper chips (static button elements) for sample prompts.
   - Placeholder card/container where “assembled plan” will appear (can show grey box + helper text).
3. Page must be responsive (stack vertically on small screens).
4. No backend calls yet—submission should be stubbed (e.g., `console.log` and keep placeholder state).
5. Route must be exported in `next.config.ts` rewrites if needed (shouldn’t be necessary, but ensure dev server serves `/canvas`).

## Implementation Steps
1. Create `src/app/canvas/page.tsx` with `metadata` (title “Canvas Chat”).
2. Build a `CanvasChat` client component under `src/components/canvas/CanvasChat.tsx` for layout logic.
3. Reuse existing `Input`, `Button`, `Badge` components from the design system.
4. Store the example chip prompts in an array and map to buttons.
5. Add minimal state for the input value; stub `handleSubmit` prevents page reload.
6. Add placeholder container (e.g., dashed border card) with copy “Your tailored workspace will appear here.”
7. Include the new component in the page and export default.

## Definition of Done
- Navigating to `/canvas` renders the new layout without console errors.
- Typing into the input and pressing submit logs the message and keeps the placeholder visible.
- Example chips populate the input when clicked.
- Responsive behaviour verified at 375px width (chips wrap, layout still usable).
- No lint/type errors (`bun run lint`, `bun run typecheck`).
