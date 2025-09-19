# Ticket PLAN2-06 — Canvas plan API endpoint

- **Story Points:** 1
- **Depends on:** PLAN2-02, PLAN2-03

## Goal
Expose `POST /api/canvas/plan` that accepts the user’s message, calls the LLM classifier (or heuristics fallback), and returns the recipe metadata to the frontend.

## Context
Plan2.md specifies a tiny LLM contract. The endpoint should live alongside existing plan API files (likely `src/app/api`). It must reuse retry/timeout utilities where possible and surface meaningful errors.

## Requirements
1. New route `src/app/api/canvas/plan/route.ts` (App Router API) handling POST requests.
2. Request body schema (Zod) with `{ message: string }` plus optional context fields (e.g., `domainEmail`, `teamSize`).
3. Response shape:
   ```json
   {
     "recipeId": "R1",
     "persona": "explorer",
     "intentTags": ["solo"],
     "confidence": 0.82,
     "reasoning": "…",
     "decisionSource": "llm" | "heuristics"
   }
   ```
4. Call existing LLM client (`generateText`) with the small prompt defined in Plan2 (create new prompt constant if needed). Timeout 3s, retry once on transient errors.
5. On timeout or low confidence (<0.6), fall back to `classifyByHeuristics`.
6. Log decisions via existing eval logger (if enabled) including the raw message.
7. Return 400 on invalid input, 500 on unexpected errors (with sanitized message).

## Implementation Steps
1. Create schema definitions using Zod; reuse types from `recipes.ts`.
2. Build prompt string for LLM (maybe under `src/lib/constants/llm.ts` or `src/lib/canvas/prompt.ts`). Keep instructions short and reference available recipe IDs.
3. Use `invokeWithTimeout` and `retryWithExponentialBackoff` helpers from existing LLM pipeline if accessible; otherwise create minimal wrapper.
4. Parse LLM JSON; clamp confidence to [0,1]; ensure persona & tags map to allowed values.
5. Integrate heuristics as fallback and set `decisionSource` accordingly.
6. Add tests using mocked LLM client to ensure fallback triggers and schema validation works (`src/app/api/canvas/plan/__tests__/route.test.ts`).

## Definition of Done
- Endpoint returns valid JSON for successful LLM classification and fallback cases.
- Tests cover: valid request (LLM high confidence), low confidence fallback, invalid payload (400), unexpected error (500).
- Logging occurs only when env flag enabled.
- Typecheck + lint + jest for API tests pass.
