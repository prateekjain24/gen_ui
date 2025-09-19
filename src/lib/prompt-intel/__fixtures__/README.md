# Prompt Intelligence Fixtures

This directory contains canonical prompts used to regression-test the Phase 4 prompt intelligence pipeline.

## Adding a Fixture
1. Create a new `*.json` file with a unique `id`, the source `prompt`, and optionally an `llm` object shaped like `PromptSignalsPartial`.
2. Include only the fields that the low-temperature parser should provide for that prompt. Use confidences between `0` and `1`.
3. Run `bunx jest src/lib/prompt-intel/__tests__/index.test.ts -u` to update snapshots.
4. Verify `bun run lint` and `bun run typecheck` before committing.

## Conventions
- Keep prompts short (~2-4 sentences) and anonymized.
- Cover tricky cases: jargon, multilingual, partial sentences, compliance, overlapping tools.
- Prefer lower confidence (<0.9) for ambiguous LLM outputs so threshold logic is exercised.
