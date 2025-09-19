# Ticket PLAN2-09 — Copy polish & example chips

- **Story Points:** 1
- **Depends on:** PLAN2-01, PLAN2-07

## Goal
Implement the copy deck and example chips defined in Plan2.md, ensuring tone and prompts are consistent with the product story.

## Context
The entry experience relies on strong copy to guide users. We already have placeholder text; this ticket finalises strings, adds localisation hooks if needed, and ensures the chips trigger relevant recipes.

## Requirements
1. Update Canvas Chat input placeholder to “What do you want to get done today?”
2. Configure three chips with prompts:
   - “Plan a workspace for my team of 10 with Slack + Jira.”
   - “Personal creative hub I can tweak later.”
   - “Client project with approvals and audit logs.”
3. When chips are clicked, populate input and auto-submit.
4. Ensure tooltips or helper copy clarifies that the screen will adapt after submission.
5. Extract strings into a `copy` object/module for future localisation (`src/lib/canvas/copy.ts`?).
6. Update README or Plan2 docs if necessary to reflect final copy.

## Implementation Steps
1. Create `src/lib/canvas/copy.ts` exporting the placeholder text, helper message, and chip array.
2. Update `CanvasChat` component to consume this module.
3. Implement chip onClick behaviour: set input value, call submit handler (debounce to avoid double submit).
4. Add helper text under input (e.g., “Canvas Chat will assemble a layout in seconds.”).
5. Run manual test to ensure chips auto-submit and plan renders.

## Definition of Done
- Copy matches Plan2 verbiage.
- Chips auto-submit and bring focus to placeholder card while loading.
- Strings centralised for future localisation.
- Typecheck/lint clean.
