# Ticket PLAN4-14 — Customize drawer skeleton

- **Story Points:** 1
- **Depends on:** PLAN4-07, PLAN4-12

## Goal
Implement the foundational "Customize" drawer UI that surfaces detected signals, knob controls, and live previews alongside the canvas plan.

## Context
Phase 4 emphasizes transparency and user control. The drawer lets reviewers tweak parameters without leaving the experience.

## Requirements
1. Add a right-side drawer component (`src/app/canvas/components/customize-drawer.tsx`) triggered from the canvas toolbar.
2. Display detected prompt signals (from PLAN4-04) with confidence badges and provenance icons.
3. Render knob controls (sliders, selects, toggles) for at least approval chain length, integration mode, copy tone, and invite strategy.
4. Show a live preview area reflecting current knob values, using existing plan rendering components.
5. Ensure responsiveness on laptop and large screens; hide on mobile for now.

## Implementation Steps
1. Define drawer layout using shadcn/ui primitives and match Tailwind grouping conventions.
2. Create reusable UI primitives for signal chips with confidence styling.
3. Bind knob controls to plan state (use existing store or context) and trigger re-render of preview on change.
4. Add placeholder data or mocked hooks if final plumbing isn’t ready yet.

## Definition of Done
- Drawer component renders with signal list, knob controls, and preview.
- UI matches design system conventions and is accessible (keyboard focus trap, aria labels).
- No lint warnings; component is storybook-ready even if not yet connected to backend updates.
