# P1-011 – Rules Engine: Review & Success Steps

## Objective
Implement the review and success states of the deterministic onboarding plan so that the flow provides an accurate summary screen, a personalized completion message, and correct stepper state. This work builds on the step builders completed in P1-010 and must satisfy the acceptance criteria listed in `PHASE1.md`.

## Acceptance Criteria Recap
- `createReviewStep` generates a meaningful summary of collected values.
- `createSuccessStep` returns a personalized success message.
- Stepper state reflects active vs. completed steps for review/success.
- Summary formatting maps internal values to display labels and handles missing data gracefully.

## Key Workstreams
1. **Review Step Implementation**
   - Map collected session values to labeled summary rows.
   - Use option maps (e.g., `ROLE_OPTIONS`, `TEAM_SIZE_OPTIONS`) to convert stored values to human-friendly labels.
   - Exclude empty/undefined values; group summary items by section (basics, workspace, preferences).
   - Ensure multi-select fields like `FEATURES` and `NOTIFICATIONS` render comma-separated labels.

2. **Success Step Personalization**
   - Generate a short success message that references the user’s first name when available.
   - Branch messaging on persona (`explorer` vs `team`). Respect `session.persona` or inferred persona fallback.
   - Provide a neutral fallback when a name is absent.

3. **Stepper State Updates**
   - Ensure `buildStepperItems` (or equivalent helper) marks the review step active when returned, with prior steps flagged as completed.
   - Hide the success step from the stepper but allow the success plan to clear the active state.

4. **Defensive Formatting Utilities**
   - Introduce helper functions for translating option values to labels to avoid duplication (may live near review builder or reuse existing constants helpers).
   - Normalize string casing (e.g., capitalize persona-based headings if needed).

5. **Testing & Verification**
   - Add unit tests covering:
     - Review summary rendering for explorer vs team sessions.
     - Handling of missing optional values.
     - Success message personalization and fallback.
     - Stepper state for review plan (active/completed flags).
   - Extend integration test to assert that submitting through workspace results in review->success progression.

## Task Breakdown
1. Audit `createReviewStep` and `createSuccessStep` in `src/lib/policy/rules.ts` and sketch desired output structure.
2. Implement formatting helpers for label lookups and list joins.
3. Update `createReviewStep` to build sectioned summaries with graceful fallbacks.
4. Update `createSuccessStep` to personalize messaging and ensure persona detection uses shared helper.
5. Adjust `buildStepperItems` if necessary to mark the correct active/completed states for review/success.
6. Add/expand unit tests in `src/lib/policy/__tests__/rules.test.ts` plus integration coverage.
7. Run `bun run typecheck`, `bun run lint`, and `bunx jest` to validate the changes.
8. Update `PHASE1.md` status for P1-011 upon completion.

## Risks & Mitigations
- **Incomplete label mapping**: Centralize lookups using existing constants to avoid missing new options.
- **Persona misclassification**: Continue to rely on the shared `detectPersona` helper to keep review/success messaging consistent with earlier steps.
- **Overly long summaries**: Limit to key fields per acceptance criteria; consider truncating or grouping if product requests.

## Definition of Done Checklist
- [ ] Review plan displays accurate, human-readable summary for explorer and team personas.
- [ ] Success plan returns tailored message with safe fallbacks.
- [ ] Stepper state mirrors the current plan state (review active, success hides stepper entry).
- [ ] Automated tests cover the new behaviors and pass locally.
- [ ] Documentation (`PHASE1.md`) updated to mark P1-011 complete.
