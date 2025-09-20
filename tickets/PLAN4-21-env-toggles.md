# Ticket PLAN4-21 — Environment toggles for personalization

- **Story Points:** 1
- **Depends on:** PLAN4-04, PLAN4-07, PLAN4-12

## Goal
Provide a tiny, Railway-friendly configuration layer that flips Phase 4 features on/off without introducing a feature-flag service.

## Context
We only need three booleans for MVP: prompt intel enrichment, personalization scoring, and the new labeling queue. Shipping a single helper to read env vars keeps things manageable and understandable for ops.

## Requirements
1. Implement `src/lib/config/toggles.ts` exporting `isPromptIntelEnabled`, `isPersonalizationEnabled`, and `isLabelingReviewEnabled` (wrapping `process.env` reads with defaults of `true`, `true`, and `false` respectively).
2. Accept flags via `ENABLE_PROMPT_INTEL`, `ENABLE_PERSONALIZATION`, and `ENABLE_LABELING_REVIEW`; document that Railway sets them in the dashboard.
3. Update `.env.local.example` plus the README Phase 4 section with one-line explanations and recommended MVP values.
4. Wrap the personalization orchestrator, customize drawer enhancements, and labeling queue API route so they short-circuit when toggles are false.
5. Add a smoke test (or unit tests) verifying that the helpers parse `"0"`, `"false"`, and undefined consistently.

## Implementation Steps
1. Create the toggle helper with a shared `toBoolean` parser and memoize results per request to avoid repeated parsing.
2. Inject the helper into prompt-intel merge, scoring, and labeling code paths; return baseline placeholders when disabled.
3. Update existing docs (README and demo script) with a “Railway deployment toggles” subsection.
4. Extend the new labeling CLI (PLAN4-20) to check `isLabelingReviewEnabled` before making requests.
5. Write tests under `src/lib/config/__tests__/toggles.test.ts` to cover the parsing behavior.

## Definition of Done
- Toggling any of the three env vars deterministically disables the phase-4 feature without throwing.
- Docs and `.env.local.example` show how to configure toggles on Railway.
- Test coverage exists for the boolean parser.
- No third-party feature flag service or runtime dashboard is introduced.
