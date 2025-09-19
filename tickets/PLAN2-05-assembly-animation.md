# Ticket PLAN2-05 — Assembly animation system

- **Story Points:** 1
- **Depends on:** PLAN2-01

## Goal
Introduce a simple animation helper so Canvas Chat can stagger field entry when a recipe is applied, adding the “wow” effect from Plan2.md.

## Context
Animations should be reusable, easy to toggle, and not block interaction. We only need a lightweight utility (CSS classes or small hook) rather than a heavy animation library.

## Requirements
1. Create `useStaggeredMount` hook (e.g., `src/hooks/useStaggeredMount.ts`) returning delays/classes for each item in a list.
2. Provide base CSS (Tailwind classes) for fade/slide (e.g., translate-y + opacity) with 50–75ms increments.
3. Update Canvas Chat container (once available) to wrap recipe fields in animation wrappers.
4. Ensure animations respect `prefers-reduced-motion`—if the user opts out, disable transitions.
5. Add documentation comment explaining usage.

## Implementation Steps
1. Implement hook that takes `count`, `durationMs` (default 75) and returns an array of delay styles or a getter.
2. Add utility class names in `globals.css` (e.g., `.animate-stagger-enter { @apply opacity-0 translate-y-2; }` and use `animate-[fade-slide]` via Tailwind keyframes).
3. In Canvas Chat component, apply `style={{ animationDelay: `${delay}ms` }}` or `transitionDelay` to each rendered field container.
4. Respect `prefers-reduced-motion` by checking `window.matchMedia` or using Tailwind `motion-safe` classes.
5. Manual test: log into `/canvas`, stub recipe (hard-code) and ensure fields animate sequentially.

## Definition of Done
- Hook returns predictable delays and disables when `prefers-reduced-motion` is true.
- Recipe field containers animate sequentially on mount.
- Animations do not re-run on unrelated state changes (only when recipe id changes).
- No console warnings; type check passes.
