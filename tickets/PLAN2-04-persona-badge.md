# Ticket PLAN2-04 — Persona badge & reasoning chip

- **Story Points:** 1
- **Depends on:** PLAN2-01

## Goal
Build reusable UI elements that communicate which persona/recipe was selected and why, as described in Plan2.md.

## Context
When the plan renders, we need an at-a-glance badge plus a short reasoning chip. These components will be fed by both the LLM response and heuristics fallback.

## Requirements
1. Create `src/components/canvas/PersonaBadge.tsx` exporting a component that accepts `{ persona: 'explorer' | 'team' | 'power'; confidence?: number }` and renders a colored pill with icon + label (Explorer/Team/Power) and optional confidence percentage.
2. Create `src/components/canvas/ReasoningChip.tsx` accepting `{ reasoning: string; tags?: string[] }` and rendering a small pill/button with tooltip or inline details.
3. Color palette:
   - Explorer: blue (`bg-sky-100 text-sky-900`).
   - Team: indigo (`bg-indigo-100 text-indigo-900`).
   - Power: amber (`bg-amber-100 text-amber-900`).
4. Ensure accessible contrast (use Tailwind variants above) and `aria-label` summarising persona/confidence.
5. Add Storybook-style dev page? (Not in scope). Instead, export from `src/components/canvas/index.ts` for easy import.
6. Unit tests (React Testing Library) verifying text & classes.

## Implementation Steps
1. Build persona badge component with map from persona → {label, icon (Lucide icons like User, Users, Shield), className}.
2. Format confidence to percentage string when provided.
3. ReasoningChip: simple `Button` variant `secondary` or `ghost`, optionally show tags as inline `Badge`.
4. Add tests under `src/components/canvas/__tests__/PersonaBadge.test.tsx` & `ReasoningChip.test.tsx` checking snapshots/classnames.
5. Export components through `src/components/canvas/index.ts`.

## Definition of Done
- Components render correct label/color per persona.
- Confidence formatted as e.g., “Confidence 72%”.
- Reasoning chip displays reasoning text and optional tags.
- Tests pass (`bunx jest src/components/canvas/__tests__`).
