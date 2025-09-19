# Ticket PLAN4-12 — Template fill pipeline

- **Story Points:** 1
- **Depends on:** PLAN4-03, PLAN4-11

## Goal
Wire the LLM to populate approved template slots, leveraging prompt signals and recipe knobs while respecting validation guardrails.

## Context
Phase 4 mandates dynamic copy tuned to the user brief. This pipeline ties together prompt intelligence, knob scoring, and the template catalog.

## Requirements
1. Create `renderTemplateCopy(planContext)` helper that assembles the prompt, calls the LLM with expanded max tokens, and feeds results through the slot validator.
2. Include explicit instructions in the prompt limiting output to the provided template JSON schema.
3. Support partial updates (only re-request slots lacking validated values).
4. Emit telemetry capturing generated text, validation results, and fallback usage (without storing raw PII—use hashed references where needed).
5. Add integration tests mocking the LLM to verify normal flow, validation fallback, and partial reruns.

## Implementation Steps
1. Define the context object (signals, recipe knobs, template id) and prompt structure.
2. Use existing OpenAI client with 30s timeout and high max tokens; no cost optimization required yet.
3. Validate responses and apply fallbacks via PLAN4-11 utilities.
4. Update plan assembly to inject rendered text into the UI data structures.
5. Add tests in `src/lib/canvas/__tests__/template-fill.test.ts` with mocked LLM responses.

## Definition of Done
- Template fill pipeline generates copy using signals/knobs and validation guardrails.
- Partial reruns work without duplicating cost.
- Telemetry logs key events.
- Tests verify success, fallback, and incremental updates.
