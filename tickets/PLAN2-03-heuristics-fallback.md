# Ticket PLAN2-03 — Heuristics fallback classifier

- **Story Points:** 1
- **Depends on:** PLAN2-02

## Goal
Implement a deterministic fallback classifier that maps the user’s initial message to a recipe when the LLM is unavailable or low-confidence.

## Context
Plan2.md outlines heuristic rules (team, client, governance, default explorer). This logic should live in a pure utility so both the API and UI can reuse it.

## Requirements
1. Add `src/lib/canvas/heuristics.ts` exporting functions:
   - `classifyByHeuristics(message: string): { recipeId: CanvasRecipeId; intentTags: string[]; persona: 'explorer' | 'team' | 'power'; confidence: number; reasoning: string }`.
   - Helper(s) for token normalisation (e.g., `extractKeywords`).
2. Rules to implement (case-insensitive):
   - Keywords [`team`, `invite`, `collaborate`, numbers >= 3] → recipe R2 (`team`).
   - Keywords [`client`, `stakeholder`, `agency`, `contract`] → R3 (`team`).
   - Keywords [`policy`, `approval`, `audit`, `security`, `compliance`] → R4 (`power`).
   - Default → R1 (`explorer`).
3. Compose `intentTags` based on matched rules (`integrations`, `invites`, `governance`, `client`, `solo`).
4. Confidence scoring: 0.8 when rule matched, 0.5 else.
5. Reasoning string summarising the match (≤120 chars).
6. Unit tests in `src/lib/canvas/__tests__/heuristics.test.ts` covering representative inputs.

## Implementation Steps
1. Implement keyword scanning (use regex or tokenisation) and number detection (`/([3-9]|1[0-9]|2[0-9]|[3-9][0-9])/`).
2. Build logic pipeline: evaluate governance > team > client precedence (ensure deterministic ordering).
3. Compose output object referencing `CanvasRecipeId` from `recipes.ts`.
4. Tests: e.g., “Need workspace for 10 engineers with Slack” → R2; “Secure approvals and audit logs” → R4; default path.
5. Run `bunx jest src/lib/canvas/__tests__/heuristics.test.ts`.

## Definition of Done
- `classifyByHeuristics` returns expected recipe/persona/tags for sample inputs.
- Tests cover each rule and default path.
- File exports reused types from recipe module; no circular imports.
- `bun run typecheck` passes.
