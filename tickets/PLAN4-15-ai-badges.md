# Ticket PLAN4-15 — AI attribution badges & tooltips

- **Story Points:** 1
- **Depends on:** PLAN4-14

## Goal
Annotate AI-influenced text and components with subtle badges and explanatory tooltips that connect decisions back to prompt signals and scoring rationales.

## Context
Users must understand why the UI changed. Badges make personalization discoverable without overwhelming the layout.

## Requirements
1. Introduce a badge component (`AIAttributionBadge`) displaying the source icon (AI, heuristic fallback) and clickable tooltip.
2. Show badges on any field or copy block modified by personalization—hook into plan data to detect overrides and rationales.
3. Tooltip content should include the driving signal(s), knob value, and confidence (rounded to two decimals).
4. Provide sensible defaults when personalization was skipped (e.g., “Using standard template”).
5. Add unit tests for the badge logic and a visual Storybook story demonstrating multiple scenarios.

## Implementation Steps
1. Create the badge component with Tailwind styling consistent with existing debug tags.
2. Extend plan rendering to pass override metadata into components that need badges.
3. Implement tooltip content builder referencing data from PLAN4-07/08.
4. Add tests verifying badge selection logic and tooltip text assembly.
5. Write Storybook entries for personalized, fallback, and default states.

## Definition of Done
- Badges appear on personalized elements with informative tooltips.
- Default/fallback states are covered gracefully.
- Tests and Storybook stories exist and pass lint/type checks.
