# Ticket PLAN4-17 — Customize drawer acceptance assets

- **Story Points:** 1
- **Depends on:** PLAN4-15, PLAN4-16

## Goal
Capture acceptance evidence for the personalized UI, including Storybook states and annotated screenshots demonstrating signal display, badges, and reset controls.

## Context
Phase 4 success criteria require stakeholders to see the adaptive experience without running the app locally. Curated assets accelerate reviews.

## Requirements
1. Add Storybook stories (or MDX gallery) showcasing: default plan, personalized plan, fallback state, and reset flow.
2. Capture high-resolution screenshots (desktop) of each story and store them in `docs/assets/phase4/` with descriptive filenames.
3. Annotate screenshots lightly (callouts or captions) to highlight AI decisions, badges, and controls.
4. Update `docs/demo-script.md` with instructions referencing the new assets.
5. Ensure stories render without runtime warnings and respect design tokens.

## Implementation Steps
1. Create or extend Storybook entries for canvas components reflecting the new drawer and badges.
2. Use built-in screenshot tooling (Chromatic, playwright, or manual capture) to generate images.
3. Store images in the docs assets folder and add alt text descriptions.
4. Update the demo script with links to the Storybook stories and screenshots.

## Definition of Done
- Storybook covers personalized vs. baseline scenarios.
- Annotated screenshots live under `docs/assets/phase4/`.
- Demo script references the assets for reviewers.
- No lint/type issues in stories.
