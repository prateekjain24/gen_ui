# Personalization Scoring Fixtures

These fixtures capture representative `PromptSignals` payloads used by `scoreRecipeKnobs` snapshot tests. Update them whenever heuristics or signal shapes change.

## File format
- Each fixture is a JSON object with:
  - `id`: human-readable name for the scenario.
  - `recipeId`: the canvas recipe expected for this flow.
  - `signals`: a `PromptSignals` record with `value` and `metadata` for every signal.
- Keep confidences between `0` and `1` and prefer `source` values from `keyword`, `llm`, or `merge`.

## Maintenance checklist
1. Regenerate or hand-edit fixtures after modifying signal extraction or scoring heuristics.
2. Run `bunx jest src/lib/personalization/__tests__/fixtures.test.ts` to review snapshot diffs.
3. Validate that fallback reasons still make sense—adjust fixture confidences if the scenario intent changed.
4. Document scenario intent in the filename for quick reference (e.g., `team-collaboration.json`).

Snapshots intentionally capture override rationales. When they change, review the diff and update the fixtures or scoring logic accordingly.
