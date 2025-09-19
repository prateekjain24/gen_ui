# Ticket PLAN4-03 — Low-temperature LLM parser

- **Story Points:** 1
- **Depends on:** PLAN4-01

## Goal
Build the structured LLM extraction path that complements the keyword layer, filling any remaining prompt signals with a controlled OpenAI call.

## Context
The hybrid extractor must tolerate complex or nuanced briefs. This parser should run with deterministic prompts and reconcile its findings with keyword-derived signals.

## Requirements
1. Add `src/lib/prompt-intel/llm-parser.ts` exposing `fetchSignalsFromLLM(prompt: string, abortSignal?: AbortSignal): Promise<PromptSignalsPartial>`.
2. Author a system prompt instructing the model to return JSON with only the approved taxonomy fields and confidence scores.
3. Configure the call to use the 30s timeout and expanded max tokens defined in Phase 4 (cost optimizations can wait).
4. Implement response validation via Zod schema; log and return `{}` on failure.
5. Provide fixture-driven tests using mocked LLM responses (success, schema error, timeout) under `src/lib/prompt-intel/__tests__/llm-parser.test.ts`.

## Implementation Steps
1. Design the prompt template referencing taxonomy field descriptions and deterministic keywords.
2. Use existing OpenAI client utilities to issue the request with low temperature (≤0.2) and high max tokens.
3. Parse and validate the JSON payload, ensuring all unknown fields are dropped.
4. Merge metadata indicating `source: 'llm'` and include returned confidences.
5. Write tests with jest mocks to cover expected branches.

## Definition of Done
- LLM parser util exists with validation and metadata handling.
- Timeout and token limits match Phase 4 requirements.
- Tests simulate both success and failure paths.
- Failures degrade gracefully without throwing uncaught errors.
